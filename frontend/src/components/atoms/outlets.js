import aljazeera from "../../assets/logos/aljazeera.svg";
import bbc from "../../assets/logos/bbc.svg";
import cbs from "../../assets/logos/cbs.svg";
import fox from "../../assets/logos/fox.svg";
import guardian from "../../assets/logos/guardian.svg";
import nbc from "../../assets/logos/nbc.svg";
import npr from "../../assets/logos/npr.svg";
import nypost from "../../assets/logos/nypost.svg";
import propublica from "../../assets/logos/propublica.svg";
import sky from "../../assets/logos/sky.svg";
import thehill from "../../assets/logos/thehill.svg";

export const OUTLETS = {
  guardian:   { label: 'The Guardian',  short: 'Guardian',   logo: guardian },
  bbc:        { label: 'BBC News',      short: 'BBC',        logo: bbc },
  npr:        { label: 'NPR',           short: 'NPR',        logo: npr },
  aljazeera:  { label: 'Al Jazeera',    short: 'Al Jazeera', logo: aljazeera },
  propublica: { label: 'ProPublica',    short: 'ProPublica', logo: propublica },
  nbc:        { label: 'NBC News',      short: 'NBC',        logo: nbc },
  cbs:        { label: 'CBS News',      short: 'CBS',        logo: cbs },
  thehill:    { label: 'The Hill',      short: 'The Hill',   logo: thehill },
  sky:        { label: 'Sky News',      short: 'Sky',        logo: sky },
  fox:        { label: 'Fox News',      short: 'Fox',        logo: fox },
  nypost:     { label: 'New York Post', short: 'NY Post',    logo: nypost },
};

export const OUTLET_KEYS = Object.keys(OUTLETS);

export const outletOf = (k) => OUTLETS[k] || null;
