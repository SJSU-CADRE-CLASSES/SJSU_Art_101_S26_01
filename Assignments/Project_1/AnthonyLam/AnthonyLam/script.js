/* ---- GLOBAL STYLE ---- */

body {
  background: #e6f2ff; /* light blue background */
  font-family: Helvetica, Arial, sans-serif;
  font-weight: bold;
  text-transform: uppercase;
  margin: 40px;
  letter-spacing: 1px;
}

/* navigation spacing */
nav a {
  margin-right: 14px;
  color: #002b66;
  text-decoration: none;
}

/* main container */
#viz {
  margin-top: 30px;
}

/* each day row */
.day {
  display: flex;
  align-items: center;
  margin-bottom: 14px;
}

/* day label text */
.label {
  width: 80px;
  color: #002b66;
}

/* bars */
.bar {
  height: 18px;
  background: #003a8c; /* dark blue bars */
  margin-right: 8px;
  border-radius: 4px;
  transition: all 0.3s ease;
}

/* spacing between categories */
.bar.social { opacity: 1; }
.bar.entertainment { opacity: 0.85; }
.bar.productivity { opacity: 0.7; }
.bar.creativity { opacity: 0.55; }
.bar.other { opacity: 0.4; }

