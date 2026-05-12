import aljazeera from "../../assets/logos/aljazeera.svg";
import bbc from "../../assets/logos/bbc.svg";
import cbs from "../../assets/logos/cbs.svg";
import guardian from "../../assets/logos/guardian.svg";
import nbc from "../../assets/logos/nbc.svg";
import npr from "../../assets/logos/npr.svg";
import propublica from "../../assets/logos/propublica.svg";
import thehill from "../../assets/logos/thehill.svg";
import usatoday from "../../assets/logos/usatoday.svg";

// `scale` rebalances visual weight: square brand marks (NBC peacock,
// The Hill stacked text, BBC blocks) get a > 1 multiplier so they read
// as substantial next to wide wordmarks like PROPUBLICA, which gets a
// < 1 multiplier so it doesn't dominate every row.
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
};

export const OUTLET_KEYS = Object.keys(OUTLETS);
