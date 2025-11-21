# CcClip Project Overview

This document provides an overview of the CcClip project, its structure, and how to work with it.

## About the Project

CcClip is a web-based video editor built with Vue.js, Vite, and TypeScript. It allows users to create and edit videos in the browser, leveraging FFmpeg for video processing tasks.

Key technologies used:
- **Frontend Framework**: Vue.js 3
- **Build Tool**: Vite
- **Language**: TypeScript
- **State Management**: Pinia
- **UI Library**: Element Plus
- **Video Processing**: FFmpeg.wasm

## Project Structure

The project is organized as follows:

- **`public/`**: Contains static assets that are served directly, including fonts, images, and the FFmpeg.wasm files.
- **`src/`**: The main application source code.
  - **`assets/`**: Static assets that are processed by Vite (e.g., CSS, images).
  - **`components/`**: Reusable Vue components.
  - **`data/`**: Static data, configurations, and options for the editor.
  - **`pages/`**: Application pages/views and their routes.
  - **`plugins/`**: Vue plugins for integrating libraries like Axios, Pinia, and FFmpeg.
  - **`services/`**: Business logic and services, such as video exporting.
  - **`stores/`**: Pinia stores for global state management.
  - **`types/`**: TypeScript type definitions.
  - **`utils/`**: Utility functions.
- **`vite.config.ts`**: Vite configuration file.
- **`package.json`**: Project dependencies and scripts.
- **`tsconfig.json`**: TypeScript configuration.

## Getting Started

### Prerequisites

- Node.js and pnpm (or npm/yarn)

### Installation

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    pnpm install
    ```

### Development

To start the development server, run:

```bash
pnpm dev
```

This will start the Vite development server, and you can access the application at `http://localhost:5173` (or another port if 5173 is in use).

## Available Scripts

- **`pnpm dev`**: Starts the development server.
- **`pnpm build`**: Builds the application for production.
- **`pnpm preview`**: Serves the production build locally for previewing.
- **`pnpm lint`**: Lints the codebase using ESLint.
- **`pnpm lint-fix`**: Lints and automatically fixes issues.
- **`pnpm test:unit`**: Runs unit tests using Vitest.
