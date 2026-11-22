# MONOVRA — convenience wrappers around docker compose.
COMPOSE := docker compose
RUN     := $(COMPOSE) run --rm builder

.PHONY: help image web apk release wrapper shell install logcat clean

help:
	@echo "make image    Build the Android builder image"
	@echo "make web      Run the frontend dev server on http://localhost:5173"
	@echo "make apk      Build debug APK   -> dist/monovra-debug.apk"
	@echo "make release  Build release APK -> dist/monovra-release.apk"
	@echo "make wrapper  (Re)generate the Gradle wrapper in android/"
	@echo "make shell    Open a shell in the builder container"
	@echo "make install  Install the debug APK with host adb"
	@echo "make logcat   Show MONOVRA logs with host adb"
	@echo "make clean    Remove build outputs"

image:
	$(COMPOSE) build builder

web:
	$(COMPOSE) up web

apk:
	$(RUN) scripts/build.sh debug

release:
	$(RUN) scripts/build.sh release

wrapper:
	$(RUN) bash -c "cd android && ./gradlew wrapper --gradle-version 8.11.1 --no-daemon"

shell:
	$(RUN) bash

install:
	adb install -r dist/monovra-debug.apk

logcat:
	adb logcat -s Monovra:* chromium:*

clean:
	rm -rf dist android/app/build android/build android/.gradle android/app/src/main/assets/web
