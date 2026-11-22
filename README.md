# SERA Apply

One application for universities in Tanzania, built for Form Six leavers by SERA.

## Run it

Sign-in uses [Firebase](https://firebase.google.com): Firebase Authentication checks emails and passwords and handles Google sign-in, and Firestore stores each student's account. The app needs a Firebase project and must be served over `http://` (opening `index.html` straight from the disk will not work).

### 1. Set up Firebase (once)

1. In the [Firebase console](https://console.firebase.google.com), create a project. The free Spark plan is enough.
2. **Authentication** → Get started → Sign-in method → turn on **Email/Password**, then add **Google** (turn it on and pick a support email).
3. **Firestore Database** → Create database (production mode). Pick a location near Tanzania, such as `europe-west1` or `africa-south1`.
4. **Project settings** → General → Your apps → add a **Web app**. Copy the `firebaseConfig` values into [`js/firebase-config.js`](js/firebase-config.js). These values are not secret; the security rules protect the data.
5. Publish the security rules in [`firestore.rules`](firestore.rules): paste them into Firestore → Rules and press Publish, or use the Firebase CLI:

   ```
   npm install -g firebase-tools
   firebase login
   firebase use --add          # pick your project
   firebase deploy --only firestore:rules
   ```

6. Add every web address the site runs on under Authentication → Settings → **Authorized domains**, for example `jhoncho517.github.io` for GitHub Pages. `localhost` and `<project-id>.web.app` are allowed already. Google sign-in fails with "not allowed on this website" until the domain is added.

### 2. Run it locally

From this folder, start any static server and open the address it prints, for example:

```
npx serve .
```

or `python -m http.server 8000` and open http://localhost:8000.

### 3. Put it online (optional)

`firebase deploy --only hosting` publishes the site to `https://<project-id>.web.app`, which is an authorized domain already.

## What's in it

| Screen | What the student does |
|---|---|
| Welcome / Sign in / Create account | Creates an account with email and password, or with Google, and gets a unique SERA ID (`SRID` + 5 digits). Signs in with email or Google. A first Google sign-in asks the student to confirm their name and agree to SERA keeping their details. Can reset a forgotten password by email, and is asked to confirm their email. The mobile number is optional. One account per email, and per mobile number when one is given. |
| Dashboard | Sees profile progress, their universities, pending applications, key dates and financial-aid shortcuts. |
| My SERA Apply | Fills in the profile: personal information (first, middle, last name), address (home or school), contact details, education (O-level and A-level schools, CSEE and ACSEE index numbers, combination) and results. Saves as they type. Works out CSEE and ACSEE divisions, and ACSEE TCU points. |
| My universities | Keeps a shortlist and applies to each university. |
| My applications | Lists every application with its reference and status (Pending, Admitted, Not admitted). |
| University search | Searches all 104 TCU-registered institutions by name or city, with filters for type, ownership, region and admitting status. |
| Direct admissions | Lists the universities that admitted the student, and lets them confirm one place. Confirming one place releases the other offers. |
| Financial aid | Puts the Samia Scholarship first, links the HESLB loan straight to OLAMS, and lists every other scholarship with a "May fit me" filter. |
| Settings | Lets the student pick a theme (Light, Dark or Eye care), download or delete their data, and use prototype tools that stand in for university decisions. The theme is saved on the device. |

## Data

The reference data is generated from `../uix/sera-apply-assets/sera-apply-assets/data/`. To regenerate it after you edit the CSV or JSON files:

```
node tools/build-data.mjs
```

This writes `js/data.js` (104 institutions, 1,103 schools and 9 scholarships).

## Limits of this prototype

- Students sign in with email or Google. Signing in with a SERA ID or phone number, or with an SMS code, needs a Cloud Function or Firebase Phone Auth, and both need the paid Blaze plan.
- The one-account-per-number check only covers a number given at sign-up. A number added or changed later in the profile is not checked.
- Students can still change their own application status from Settings → Prototype tools. Before launch, decisions should come only from universities (for example through a Cloud Function or admin tool), and the rules should stop students from writing them.
- Results are self-reported until SERA has a data agreement with NECTA.
- University decisions are simulated from Settings until partner universities are connected.
