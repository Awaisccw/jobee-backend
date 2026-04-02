# Backend Setup Guide: Node.js, Express, and MongoDB

Welcome to backend development! This guide will walk you through setting up a complete backend infrastructure for your "awais app" project on your Windows PC from scratch. We are using **Node.js** as the runtime environment, **Express.js** as the web framework, and **MongoDB** as our database.

Since this is your first time, I have created the basic files for you. Let's go through the steps to get everything installed and running.

---

## Step 1: Install Required Software
Before we can run the code, you need to install the core technologies on your computer.

### 1. Install Node.js
Node.js allows us to run JavaScript on our computer (outside of a web browser).
*   **Action:** Go to the [Node.js official website (nodejs.org)](https://nodejs.org/) and download the "LTS" (Long Term Support) version for Windows.
*   **Action:** Run the downloaded installer and follow the standard instructions (clicking "Next" through the prompts is fine).
*   **Verification:** To check if it installed correctly, open a new terminal (like Command Prompt or PowerShell) and type: `node -v` and `npm -v`. This should print out version numbers.

### 2. Install MongoDB (Database)
MongoDB is where we will store the app's data. We will install it locally on your PC.
*   **Action:** Go to the [MongoDB Community Server download page](https://www.mongodb.com/try/download/community). Ensure "Windows" is selected for the OS, and download the `.msi` package.
*   **Action:** Run the installer. Choose the "Complete" installation type.
*   **Important:** During installation, it will ask if you want to set up MongoDB as a "Windows Service". **Leave this enabled**. It will also offer to install "MongoDB Compass" (a visual database viewer) - check that box too; it will be very helpful later!
*   **Verification:** Since we installed it as a service, it should be running automatically in the background on port `27017`.

---

## Step 2: Install Project Dependencies
I have created a `package.json` file in your `d:\awais app\backend` folder. This file lists all the pre-packaged code (libraries/dependencies) our project needs:
*   `express`: The framework that makes handling web requests easy.
*   `mongoose`: A tool to easily interact with our MongoDB database.
*   `cors`: Essential for allowing your frontend app to talk to this backend app.
*   `dotenv`: Helps manage environment variables like database links securely.
*   `nodemon`: A very handy tool for development. It automatically restarts your server whenever you save a change.

Now we need to download these packages. Keep in mind that we're using your computer's terminal now.

*   **Action:** Open a terminal (Command Prompt, PowerShell, or the terminal inside VS Code).
*   **Action:** Navigate to your backend folder. If you are not already there, type:
    ```bash
    cd "d:\awais app\backend"
    ```
*   **Action:** Run the installation command:
    ```bash
    npm install
    ```
    *(You will see a "node_modules" folder appear when this finishes).*

---

## Step 3: Run the Server
I have created a primary entry point file named `index.js`. This file configures the server and attempts to connect to your local MongoDB database.

*   **Action:** Ensure you're still in the `d:\awais app\backend` folder in your terminal.
*   **Action:** Because we're in development, we will use our auto-restarting script. Type:
    ```bash
    npm run dev
    ```

You should see output similar to this:
```
[nodemon] starting `node index.js`
Successfully connected to MongoDB.
Server is running on port: 5000
```
*(Note: If MongoDB fails to connect, review Step 1.2 to ensure the MongoDB service was installed and is running on your PC).*

---

## Next Steps: Designing the Database and API
Your backend is currently essentially an empty shell that is successfully connected to the database. The next steps will involve creating specific routes and data models. Have a think about what kind of data the awais app needs to store (e.g., Users, Posts, Products, etc.).

Once your server is up and running successfully by following the steps above, let me know what features you want to build next!
