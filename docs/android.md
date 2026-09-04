# Building the Android app

The web build in `build/` is wrapped by [Capacitor](https://capacitorjs.com) and
shipped as a native Android app. Assets are bundled inside the APK, so the app
works offline and does not depend on GitHub Pages being up.

Two settings that already existed for GitHub Pages are what make this work
unchanged: `base: './'` in `vite.config.ts` gives relative asset URLs, and the
app uses a `HashRouter`, so no server-side rewrite is needed. Capacitor serves
the bundle from a local origin, where both of those matter.

## The native project is not committed

`.gitignore` excludes `android/`, `ios/` and `.capacitor/`. The native project
is **regenerated**, not version-controlled, so everything that shapes it has to
live in `capacitor.config.ts`.

The consequence is worth being deliberate about: **hand-edits to files under
`android/` are lost** on a fresh clone or a re-init. If you reach the point of
needing custom native code, a launcher icon set, extra permissions, or signing
config, either express it through `capacitor.config.ts` and a Capacitor plugin,
or drop `android/` from `.gitignore` and start committing it — the usual choice
for a Capacitor app once it stops being a pure wrapper.

## Prerequisites

Neither is needed for the web build, only for producing an APK.

- **JDK 17** — `winget install EclipseAdoptium.Temurin.17.JDK`
- **Android Studio** (brings the Android SDK and an emulator) —
  `winget install Google.AndroidStudio`

Then let Android Studio install the SDK on first launch, and confirm
`JAVA_HOME` and `ANDROID_HOME` are set.

## Workflow

```bash
npm run android:init    # first time: scaffolds android/ and syncs
npm run android:sync    # after any web change: rebuild + copy into the shell
npm run android:open    # open the project in Android Studio
```

`android:sync` runs `npm run build` first, so the shell always carries the
current web build. Run it after every change — the native project holds a
*copy* of `build/`, not a reference to it.

### Producing an APK

From Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.

Or from the command line, once the JDK and SDK are in place:

```bash
cd android && ./gradlew assembleDebug
# -> android/app/build/outputs/apk/debug/app-debug.apk
```

A debug APK is fine for sideloading and direct distribution. For the Play Store
you need a signed **AAB** (`./gradlew bundleRelease`) and a keystore — Play no
longer accepts APKs for new apps.

## What the shell adds

`src/native/` holds the only code that knows it is running natively. Everything
in it no-ops in a browser, guarded on `Capacitor.isNativePlatform()`, because
the same bundle is served by GitHub Pages.

- **`NativeShell.tsx`** — mounted inside the router.
  - **Hardware back button.** Without this, Android's back gesture exits the app
    from any screen, because the shell has no idea the web view has its own
    history stack. It now pops router history and only exits at the root.
  - **Status bar tinting.** The landing page is near-black and every other
    screen sits on `#f5f5f7`, so the status bar style flips with the route or
    its glyphs disappear into the background.
- **`index.ts`** — the `isNative()` guard and the status-bar helper.

## Not yet done

- **Launcher icon and splash screen** still use the Capacitor defaults.
  `@capacitor/assets` generates a full set from one source image, but note the
  section above: the output lands in `android/`, which is not committed.
- **Nothing here has been run on a device or emulator.** The web build is
  verified (typecheck, build, and the drive-app smoke test all pass with
  Capacitor installed, and `Capacitor.getPlatform()` correctly reports `web`),
  but the native behaviours — back button, status bar, offline load — need a
  real device or emulator to confirm.
