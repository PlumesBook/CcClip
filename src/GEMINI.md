# `src` Directory Overview

This document describes the structure and purpose of the directories within the `src` folder.

## Directory Structure

- **`api/`**: Contains mock API implementations. This can be used for development and testing without a live backend.

- **`assets/`**: Holds static assets that are imported into the application's source code and processed by Vite, such as global CSS files and images.

- **`components/`**: This is where all the Vue components are stored.
  - **`container/`**: Components that act as containers for different sections of the UI (e.g., `HeaderContainer`, `TrackContainer`).
  - **`icons/`**: SVG-based icon components.
  - **`item/`**: More complex components, often related to a specific feature like the player or track items.

- **`data/`**: Contains static data, constants, and configuration objects used throughout the application. This includes definitions for menus, tracks, and various editor options.

- **`pages/`**: Contains the main pages of the application.
  - **`routers/`**: Route definitions for Vue Router.
  - **`views/`**: The top-level Vue components for each page (e.g., `Editor.vue`).

- **`plugins/`**: Vue plugins used to initialize and configure third-party libraries like Pinia, Vue Router, and FFmpeg.

- **`services/`**: Houses the core business logic of the application. For example, `exportVideo.ts` contains the logic for exporting videos.

- **`stores/`**: Pinia store modules for managing the application's global state. Each file typically represents a different slice of the state (e.g., `playerState`, `trackState`).

- **`types/`**: Contains TypeScript type definitions and interfaces used across the project.

- **`utils/`**: A collection of utility functions that can be reused throughout the application. This includes helpers for canvas manipulation, FFmpeg commands, and more.
