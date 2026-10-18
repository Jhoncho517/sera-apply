# SERA Apply

One application for universities in Tanzania, built for Form Six leavers by SERA.

## Run it

Open `index.html` in Chrome, Edge or Firefox. It needs no server and no install.

## What's in it

| Screen | What the student does |
|---|---|
| Welcome / Sign in / Create account | Creates an account and gets a unique SERA ID (`SRID` + 5 digits). Can sign in with email or SERA ID. |
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

- Accounts and applications are stored only in this browser's `localStorage`. Each SERA ID is unique within this browser only. A real launch needs a server and database so that IDs are unique for everyone and applications reach the universities.
- Passwords are hashed with SHA-256 in the browser. A real launch should use server-side authentication and SMS one-time codes.
- Results are self-reported until SERA has a data agreement with NECTA.
- University decisions are simulated from Settings until partner universities are connected.
