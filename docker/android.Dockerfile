# MONOVRA build environment: JDK 17 + Android SDK + Node.js.
# Gradle itself comes from the project's wrapper (android/gradlew) and is
# cached in the `gradle_cache` volume.
#
# Pinned to linux/amd64 because Google only publishes Linux build-tools
# (aapt2, d8, zipalign) for x86_64. On Apple Silicon this runs through
# Rosetta (Colima: `colima start --vz-rosetta`) or QEMU.
FROM --platform=linux/amd64 eclipse-temurin:17.0.13_11-jdk-jammy

ARG CMDLINE_TOOLS_VERSION=11076708
ARG ANDROID_PLATFORM=35
ARG ANDROID_BUILD_TOOLS=35.0.0
ARG NODE_VERSION=22.11.0

ENV ANDROID_HOME=/opt/android-sdk \
    ANDROID_SDK_ROOT=/opt/android-sdk \
    GRADLE_USER_HOME=/root/.gradle \
    NODE_HOME=/opt/node
ENV PATH=${NODE_HOME}/bin:${ANDROID_HOME}/cmdline-tools/latest/bin:${ANDROID_HOME}/platform-tools:${PATH}

RUN apt-get update \
 && apt-get install -y --no-install-recommends curl unzip git ca-certificates xz-utils \
 && rm -rf /var/lib/apt/lists/*

# Node.js (official tarball) — used only at build time to compile the Vite frontend.
RUN curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" -o /tmp/node.tar.xz \
 && mkdir -p ${NODE_HOME} \
 && tar -xJf /tmp/node.tar.xz -C ${NODE_HOME} --strip-components=1 \
 && rm /tmp/node.tar.xz

# Android command-line tools + SDK packages.
RUN curl -fsSL "https://dl.google.com/android/repository/commandlinetools-linux-${CMDLINE_TOOLS_VERSION}_latest.zip" -o /tmp/cmdline.zip \
 && mkdir -p ${ANDROID_HOME}/cmdline-tools \
 && unzip -q /tmp/cmdline.zip -d ${ANDROID_HOME}/cmdline-tools \
 && mv ${ANDROID_HOME}/cmdline-tools/cmdline-tools ${ANDROID_HOME}/cmdline-tools/latest \
 && rm /tmp/cmdline.zip \
 && yes | sdkmanager --licenses > /dev/null \
 && sdkmanager --install "platforms;android-${ANDROID_PLATFORM}" "build-tools;${ANDROID_BUILD_TOOLS}" "platform-tools" > /dev/null

WORKDIR /workspace
CMD ["bash"]
