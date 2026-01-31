# Fath-AI Mobile: Pocket Process Engineer

## 1. Executive Summary
This is the **Mobile Operation Module** for **Fath-AI: Local Process Engineering Assistant**. While the [core system](../Personal_Local_LLM/README.md) is designed for powerful desktop/server environments, this repository focuses on ultra-portable deployment on Android devices (specifically validated on **Poco F4 / Snapdragon 870**).

It enables Process Engineers to have an offline, air-gapped LLM on their phone for field work, capable of running Qwen2/Phi-3 models via Termux.

## 2. Key Capabilities
*   **Fully Offline**: Runs entirely on-device using Termux + proot-distro. No cloud latency or data leakage.
*   **Hardware Optimized**: Tuned for Snapdragon 870 (ARM64), balancing RAM usage (~2.5GB) and inference speed.
*   **Fath-AI Sync**: Deploys a lighter version of the standard Fath-AI Web UI "Control Room".

## 3. Installation & Usage
For detailed, step-by-step deployment instructions, please refer to the **[DEPLOY_TO_PHONE.md](./DEPLOY_TO_PHONE.md)** guide.

### Quick Summary
1.  **Environment**: Termux on Android.
2.  **Infrastructure**: Docker is replaced by `proot-distro` (running Debian).
3.  **Core**: Ollama (native Termux) + Next.js Web UI (chrooted Debian).

## 4. Relationship to Core Project
This project is a satellite implementation of the main **[Fath-AI System](../Personal_Local_LLM/README.md)**.
*   **Core Logic**: Replaced by lightweight mobile options.
*   **Search**: Disabled or limited in this mobile implementation (focus is on reasoning/chat).
*   **UI**: Adapted for touch interfaces and mobile viewports.

---
*Maintained by Fath Alwi*
