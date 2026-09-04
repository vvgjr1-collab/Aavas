
  # Aavas App

  This is a code bundle for UX Module RentRight App (Copy). The original project is available at https://www.figma.com/design/0YHt57AOs5j6OOK3cj9b23/UX-Module-RentRight-App--Copy-.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Android app

  The same build is wrapped by Capacitor and shipped as a native Android app.
  See [docs/android.md](docs/android.md) for prerequisites and the workflow.

  ## Database

  Postgres on Supabase. The anon key is public on a static host, so Row Level
  Security is the whole security model - run `npm run db:test` before changing a
  policy. See [docs/database.md](docs/database.md).
  
