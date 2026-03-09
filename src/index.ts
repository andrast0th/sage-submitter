// This file is the entry point of the application. It initializes the application and may include setup for services and configurations.

import config from "./config";
import { startServices } from "./services";

const initializeApp = async () => {
  try {
    console.log(
      "Initializing application with the following configuration:",
      config,
    );
    await startServices();
    console.log("Application initialized successfully.");
  } catch (error) {
    console.error("Error initializing application:", error);
  }
};

initializeApp();
