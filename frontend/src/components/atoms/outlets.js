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
import usatoday from "../../assets/logos/usatoday.svg";

// `scale` rebalances visual weight: square brand marks (NBC peacock,
// The Hill stacked text, BBC blocks) get a > 1 multiplier so they read
// as substantial next to wide wordmarks like NY POST or PROPUBLICA,
// which get a < 1 multiplier so they don't dominate every row.
export const OUTLETS = {
  guardian:   { label: 'The Guardian',  short: 'Guardian',   logo: guardian,   scale: 1.0  },
  bbc:        { label: 'BBC News',      short: 'BBC',        logo: bbc,        scale: 1.05 },
  npr:        { label: 'NPR',           short: 'NPR',        logo: npr,        scale: 1.05 },
  aljazeera:  { label: 'Al Jazeera',    short: 'Al Jazeera', logo: aljazeera,  scale: 1.15 },
  propublica: { label: 'ProPublica',    short: 'ProPublica', logo: propublica, scale: 0.85 },
  nbc:        { label: 'NBC News',      short: 'NBC',        logo: nbc,        scale: 1.4  },
  cbs:        { label: 'CBS News',      short: 'CBS',        logo: cbs,        scale: 1.25 },
  thehill:    { label: 'The Hill',      short: 'The Hill',   logo: thehill,    scale: 1.5  },
  usatoday:   { label: 'USA Today',     short: 'USA Today',  logo: usatoday,   scale: 0.9  },
  sky:        { label: 'Sky News',      short: 'Sky',        logo: sky,        scale: 0.95 },
  fox:        { label: 'Fox News',      short: 'Fox',        logo: fox,        scale: 1.0  },
  nypost:     { label: 'New York Post', short: 'NY Post',    logo: nypost,     scale: 0.85 },
};

export const OUTLET_KEYS = Object.keys(OUTLETS);

export const outletOf = (k) => OUTLETS[k] || null;
