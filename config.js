/* Zentrale Einstellungen für Prüfstand – hier anpassen, ohne die Programmlogik zu ändern. */
window.PRUEFSTAND_CONFIG = {
  /* Lernziel-Grenze in Prozent. Auf null setzen, um gar keine Grenze/Bewertung anzuzeigen.
     Es gibt keine amtliche Grenze für diese Übungstests; der Wert ist eine transparente Lernorientierung.
     Einzelne Prüfungen können in fragen/*.js mit passPercent eine eigene Grenze setzen. */
  passPercent: 60,

  /* Antwortreihenfolge bei jedem Start mischen (true) oder wie in der Datei lassen (false). */
  shuffleOptions: true,

  /* Kontaktformular: Adresse (Endpoint) des externen Formulardienstes.
     LEER LASSEN, solange kein Dienst eingerichtet ist -> Formular meldet ehrlich, dass der Versand
     nicht möglich ist, und bietet den Weg per E-Mail an. Einrichtung: siehe ANLEITUNG.md. */
  formEndpoint: "",

  /* Optionale zusätzliche Felder, die der Formulardienst verlangt (z. B. {access_key: "..."} bei Web3Forms;
     der Access Key ist dort öffentlich vorgesehen). Standard: leer. */
  formExtraFields: {},

  /* Öffentliche Kontaktdaten (nur diese erscheinen im Kontaktbereich). */
  kontaktName: "Jason Mike Nadler",
  kontaktEmail: "jason.nadler@soz-pankow.de",
  kontaktTelefon: "015736663511"
};
