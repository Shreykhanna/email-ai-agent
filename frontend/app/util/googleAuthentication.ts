// "use server";

// import fs from "fs";
// import path from "path";
// import { google } from "googleapis";
// import { authenticate } from "@google-cloud/local-auth";
// import { SCOPES } from "@/constants/constants";

// export const googleAuthentication = async () => {
//   const CREDENTIALS = path.join(
//     process.cwd(),
//     "credentials",
//     "credentials.json",
//   );
//   const TOKEN = path.join(process.cwd(), "credentials", "token.json");
//   const creds = JSON.parse(fs.readFileSync(CREDENTIALS, "utf8"));
//   const client = creds.installed ?? creds.web;
//   const oAuth2 = new google.auth.OAuth2(
//     client.client_id,
//     client.client_secret,
//     client.redirect_uris?.[0],
//   );

//   if (fs.existsSync(TOKEN)) {
//     const credentials = JSON.parse(fs.readFileSync(TOKEN, "utf8"));
//     oAuth2.setCredentials(credentials);
//     return credentials;
//   }

//   const auth = await authenticate({ keyfilePath: CREDENTIALS, scopes: SCOPES });
//   fs.writeFileSync(TOKEN, JSON.stringify(auth.credentials, null, 2));
//   return auth.credentials;
// };
