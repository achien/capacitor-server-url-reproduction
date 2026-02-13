import { WebView } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { SplashScreen } from "@capacitor/splash-screen";

const updatedIndexHtml = `
<html>
  <head>
    <meta
      name="viewport"
      content="viewport-fit=cover, width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no"
    />

    <style>
      body {
        padding: 10px;
      }
      .container {
        display: flex;
        flex-direction: column;
        height: 100%;
        align-items: center;
        justify-content: center;
      }
      h1 {
        font-size: 32px;
      }
      p, button {
        font-size: 16px;
        overflow-wrap: anywhere;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Updated app</h1>
      <p>
        First persist the server URL so the updated app always loads:
      </p>
      <button id="persist">
        Persist server URL
      </button>
      <p>
        Then simulate iOS device migration by deleting the contents of the Library/NoCloud directory:
      </p>
      <button id="delete">
        Delete updated app
      </button>
      <p id="outcome"></p>
    </div>

    <script>
      const { Filesystem, WebView } = Capacitor.Plugins;

      async function persistServerUrl() {
        try {
          await WebView.persistServerBasePath();
          console.log('persisted server base path');
          document.querySelector("#outcome").textContent = "Persisted. Now delete app data to finish reproducing.";
        } catch (e) {
          console.error('persistServerBasePath failed', e);
          document.querySelector("#outcome").textContent = "persist error: " + String(e);
        }
      }

      async function deleteAppData() {
        try {
          const dir = "ionic_built_snapshots";
          await Filesystem.rmdir({
            directory: 'LIBRARY_NO_CLOUD',
            path: dir,
            recursive: true,
          });
          console.log('deleted app from ' + dir);
          document.querySelector("#outcome").textContent = "Deleted. Force close and reopen the app, it will crash.";
        } catch (e) {
          console.error('deleteAppData failed', e);
          document.querySelector("#outcome").textContent = "delete error: " + String(e);
        }
      }

      document.querySelector("#persist").addEventListener("click", persistServerUrl);
      document.querySelector("#delete").addEventListener("click", deleteAppData);
    </script>
  </body>
</html>
`;

window.customElements.define(
  "capacitor-welcome",
  class extends HTMLElement {
    constructor() {
      super();

      SplashScreen.hide();

      const root = this.attachShadow({ mode: "open" });

      root.innerHTML = `
    <style>
      body {
        padding: 10px;
      }
      .container {
        display: flex;
        flex-direction: column;
        height: 100%;
        align-items: center;
        justify-content: center;
      }
      h1 {
        font-size: 32px;
      }
      p, button {
        font-size: 16px;
        overflow-wrap: anywhere;
      }
    </style>

    <div class="container">
      <h1>Base app</h1>
      <p>
        <button class="button" id="update-app">
          Update app
        </button>
      </p>
    </div>
    `;
    }

    connectedCallback() {
      const self = this;

      self.shadowRoot
        .querySelector("#update-app")
        .addEventListener("click", async () => {
          const dir = "ionic_built_snapshots/updated";
          try {
            await Filesystem.writeFile({
              directory: Directory.LibraryNoCloud,
              path: `${dir}/index.html`,
              data: updatedIndexHtml,
              encoding: Encoding.UTF8,
              recursive: true,
            });
            console.log(`wrote new index.html`);
            const fileInfo = await Filesystem.getUri({
              directory: Directory.LibraryNoCloud,
              path: dir,
            });
            const path = new URL(fileInfo.uri).pathname;
            console.log(`setting server base path ${path}`);
            await WebView.setServerBasePath({ path: path });
          } catch (e) {
            console.error("Error updating app", e);
          }
        });
    }
  },
);
