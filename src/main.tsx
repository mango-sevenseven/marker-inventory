
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import { initializeRemotePersistence } from "./data/remotePersistence";
  import "./styles/index.css";

  async function start() {
    await initializeRemotePersistence();
    createRoot(document.getElementById("root")!).render(<App />);
  }

  void start();
