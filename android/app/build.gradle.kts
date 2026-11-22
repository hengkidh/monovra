plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// Version can be injected by CI: -PversionName=1.2.0 -PversionCode=12
// or env MONOVRA_VERSION_NAME / MONOVRA_VERSION_CODE.
fun prop(name: String, env: String): String? =
    (findProperty(name) as String?)?.takeIf { it.isNotBlank() }
        ?: System.getenv(env)?.takeIf { it.isNotBlank() }

val monovraVersionName = prop("versionName", "MONOVRA_VERSION_NAME") ?: "0.1.0"
val monovraVersionCode = prop("versionCode", "MONOVRA_VERSION_CODE")?.toIntOrNull() ?: 1

// Release signing from environment (see README). Falls back to debug signing
// so `assembleRelease` always produces an installable APK.
val keystoreFile = System.getenv("MONOVRA_KEYSTORE_FILE")?.takeIf { it.isNotBlank() }?.let { file(it) }
val hasReleaseKeystore = keystoreFile?.exists() == true

android {
    namespace = "id.hengki.monovra"
    compileSdk = 35

    defaultConfig {
        applicationId = "id.hengki.monovra"
        minSdk = 29
        targetSdk = 35
        versionCode = monovraVersionCode
        versionName = monovraVersionName
    }

    signingConfigs {
        if (hasReleaseKeystore) {
            create("release") {
                storeFile = keystoreFile
                storePassword = System.getenv("MONOVRA_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("MONOVRA_KEY_ALIAS")
                keyPassword = System.getenv("MONOVRA_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = if (hasReleaseKeystore) {
                signingConfigs.getByName("release")
            } else {
                logger.warn("MONOVRA: no release keystore configured, signing release with the debug key.")
                signingConfigs.getByName("debug")
            }
        }
    }

    buildFeatures {
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    packaging {
        resources.excludes += setOf("META-INF/*.kotlin_module", "DebugProbesKt.bin")
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.activity:activity-ktx:1.9.3")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("androidx.webkit:webkit:1.12.1")
    implementation("androidx.datastore:datastore-preferences:1.1.1")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
}

// The WebView UI is compiled by Vite into src/main/assets/web. Fail early with a
// clear message instead of shipping an APK with a blank screen.
val checkFrontend by tasks.registering {
    val index = file("src/main/assets/web/index.html")
    doLast {
        if (!index.exists()) {
            throw GradleException(
                "Frontend bundle missing: ${index.path}\n" +
                    "Run `npm ci && npm run build` in ./frontend (or `make apk`)."
            )
        }
    }
}
tasks.named("preBuild") { dependsOn(checkFrontend) }
