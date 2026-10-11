"""
KCET / Karnataka PUC syllabus map (NCERT aligned) with classification keywords.

Each chapter carries:
  strong : terms that on their own strongly imply the chapter (weight 4)
  weak   : supporting terms (weight 1)
Keywords are matched case-insensitively on word boundaries against the question
stem + options + solution text.

`cls` is the PU year the chapter belongs to (1 = 1st PUC / Class 11, 2 = 2nd PUC).
"""

PHYSICS = [
    ("Units and Measurements", 1,
     ["dimensional formula", "dimensions of", "significant figures", "least count",
      "vernier", "screw gauge", "percentage error", "relative error", "dimensional analysis"],
     ["error", "accuracy", "precision", "unit", "measurement", "parallax"]),

    ("Motion in a Straight Line", 1,
     ["uniformly accelerated", "velocity time graph", "retardation", "free fall",
      "relative velocity", "displacement time"],
     ["acceleration", "velocity", "displacement", "speed", "distance travelled", "rest"]),

    ("Motion in a Plane", 1,
     ["projectile", "range of the projectile", "angle of projection", "circular motion",
      "centripetal acceleration", "resultant of two vectors", "unit vector", "scalar product",
      "vector product", "cross product", "dot product"],
     ["vector", "trajectory", "horizontal", "angle", "component"]),

    ("Laws of Motion", 1,
     ["newton's second law", "newton's third law", "coefficient of friction", "static friction",
      "kinetic friction", "banking of road", "impulse", "free body diagram", "conservation of momentum"],
     ["friction", "tension", "normal reaction", "momentum", "inertia", "pseudo force", "block"]),

    ("Work, Energy and Power", 1,
     ["work energy theorem", "kinetic energy", "potential energy", "coefficient of restitution",
      "elastic collision", "inelastic collision", "conservative force", "power delivered"],
     ["work done", "energy", "power", "collision", "spring constant", "joule", "watt"]),

    ("System of Particles and Rotational Motion", 1,
     ["moment of inertia", "angular momentum", "centre of mass", "center of mass", "torque",
      "radius of gyration", "rolling without slipping", "parallel axis theorem",
      "perpendicular axis theorem", "angular acceleration"],
     ["rotation", "rigid body", "flywheel", "disc", "sphere rolling", "angular velocity"]),

    ("Gravitation", 1,
     ["escape velocity", "orbital velocity", "kepler", "gravitational potential",
      "acceleration due to gravity", "geostationary", "universal gravitational constant"],
     ["satellite", "orbit of the satellite", "gravitational", "planet", "earth's surface",
      "weightlessness", "orbital radius of the satellite"]),

    ("Mechanical Properties of Solids", 1,
     ["young's modulus", "bulk modulus", "modulus of rigidity", "poisson's ratio",
      "longitudinal strain", "elastic limit", "shear modulus", "stress strain"],
     ["stress", "strain", "elasticity", "wire stretched", "elongation", "hooke"]),

    ("Mechanical Properties of Fluids", 1,
     ["surface tension", "capillary rise", "viscosity", "terminal velocity", "bernoulli",
      "reynolds number", "pascal's law", "excess pressure", "angle of contact", "stokes law"],
     ["fluid", "liquid", "buoyancy", "streamline", "pressure", "drop", "bubble"]),

    ("Thermal Properties of Matter", 1,
     ["coefficient of linear expansion", "thermal conductivity", "latent heat", "specific heat capacity",
      "newton's law of cooling", "stefan", "wien's displacement", "black body", "calorimetry"],
     ["temperature", "heat", "thermal expansion", "conduction", "radiation", "celsius", "kelvin"]),

    ("Thermodynamics", 1,
     ["first law of thermodynamics", "second law of thermodynamics", "carnot", "isothermal",
      "adiabatic", "isobaric", "isochoric", "heat engine", "refrigerator", "efficiency of the engine",
      "molar specific heat", "ratio of molar specific heats"],
     ["entropy", "cyclic process", "internal energy", "reversible", "work done by the gas"]),

    ("Kinetic Theory", 1,
     ["mean free path", "degrees of freedom", "equipartition", "rms speed",
      "root mean square speed", "avogadro", "kinetic theory of gases"],
     ["ideal gas", "mole", "molecules", "gas equation", "pressure of gas"]),

    ("Oscillations", 1,
     ["simple harmonic motion", "shm", "simple pendulum", "time period of oscillation",
      "damped oscillation", "resonance of spring", "angular frequency of oscillation", "phase difference"],
     ["oscillation", "amplitude", "periodic", "restoring force", "pendulum", "mean position"]),

    ("Waves", 1,
     ["doppler effect", "beats", "standing wave", "stationary wave", "fundamental frequency",
      "organ pipe", "harmonics", "wave equation", "transverse wave", "longitudinal wave",
      "speed of sound", "resonance tube"],
     ["wavelength", "frequency", "sound", "string vibrat", "overtone", "node", "antinode"]),

    ("Electric Charges and Fields", 2,
     ["coulomb's law", "electric dipole", "dipole moment", "electric flux", "gauss",
      "linear charge density", "surface charge density", "electric field intensity",
      "electrostatic force", "torque on dipole"],
     ["charge", "electric field", "point charge", "electrostatic", "field lines", "permittivity"]),

    ("Electrostatic Potential and Capacitance", 2,
     ["electrostatic potential", "equipotential", "capacitance", "parallel plate capacitor",
      "dielectric constant", "energy stored in the capacitor", "capacitors in series",
      "capacitors in parallel", "electric potential energy"],
     ["potential difference", "capacitor", "dielectric", "farad", "voltage across", "conductor"]),

    ("Current Electricity", 2,
     ["ohm's law", "kirchhoff", "wheatstone", "meter bridge", "potentiometer", "drift velocity",
      "internal resistance", "temperature coefficient of resistance", "resistivity",
      "specific resistance", "emf of the cell", "resistance in series", "resistance in parallel"],
     ["current", "resistance", "resistor", "ammeter", "voltmeter", "galvanometer", "battery", "cell"]),

    ("Moving Charges and Magnetism", 2,
     ["biot savart", "ampere's circuital", "cyclotron", "lorentz force", "solenoid", "toroid",
      "magnetic force on a current", "moving coil galvanometer", "current carrying conductor",
      "magnetic field at the centre"],
     ["magnetic field", "current loop", "charged particle", "tesla", "helix", "circular coil"]),

    ("Magnetism and Matter", 2,
     ["magnetic susceptibility", "diamagnetic", "paramagnetic", "ferromagnetic", "hysteresis",
      "curie", "magnetic dipole moment", "bar magnet", "earth's magnetic field",
      "angle of dip", "declination", "permeability"],
     ["magnet", "magnetis", "magnetic moment", "pole strength"]),

    ("Electromagnetic Induction", 2,
     ["faraday's law", "lenz's law", "self inductance", "mutual inductance", "eddy current",
      "motional emf", "induced emf", "magnetic flux linked", "henry"],
     ["induced", "flux", "inductance", "coil", "rate of change of flux"]),

    ("Alternating Current", 2,
     ["l-c-r", "lcr circuit", "resonant frequency", "quality factor", "power factor",
      "impedance", "reactance", "rms value", "transformer", "wattless current", "choke coil"],
     ["alternating", "ac circuit", "phasor", "peak value", "capacitive", "inductive", "frequency of ac"]),

    ("Electromagnetic Waves", 2,
     ["displacement current", "electromagnetic spectrum", "microwave", "infrared", "ultraviolet",
      "gamma rays", "x-rays", "radio waves", "poynting"],
     ["electromagnetic wave", "speed of light in vacuum", "maxwell", "wave propagat"]),

    ("Ray Optics and Optical Instruments", 2,
     ["refractive index", "total internal reflection", "critical angle", "lens maker",
      "angle of minimum deviation", "prism", "magnifying power", "compound microscope",
      "astronomical telescope", "focal length", "mirror formula", "power of the lens", "optical fibre"],
     ["mirror", "lens", "refraction", "reflection", "image formed", "convex", "concave", "objective",
      "eyepiece", "magnification"]),

    ("Wave Optics", 2,
     ["young's double slit", "interference", "fringe width", "diffraction", "polarisation",
      "polarization", "brewster", "malus", "huygens", "coherent source", "path difference",
      "single slit", "resolving power"],
     ["slit", "fringe", "polaroid", "monochromatic", "wavefront", "bright band", "dark band"]),

    ("Dual Nature of Radiation and Matter", 2,
     ["photoelectric effect", "work function", "stopping potential", "threshold frequency",
      "de broglie", "photon energy", "einstein's photoelectric", "matter wave"],
     ["photon", "photoelectron", "electron emitted", "incident light", "planck's constant"]),

    ("Atoms", 2,
     ["bohr", "rutherford", "balmer", "lyman", "paschen", "rydberg", "hydrogen spectrum",
      "alpha particle scattering", "bohr radius", "energy level of hydrogen"],
     ["orbit of the atom", "ionisation energy of hydrogen", "excited state", "ground state",
      "spectral line", "nucleus of atom", "hydrogen atom", "energy state", "radius of the orbit",
      "orbit velocity", "electron excites", "stationary orbit", "energy level"]),

    ("Nuclei", 2,
     ["binding energy", "mass defect", "radioactive decay", "half life", "mean life",
      "nuclear fission", "nuclear fusion", "decay constant", "activity of a radioactive",
      "mass number", "isotope", "nuclear density", "becquerel", "curie"],
     ["nucleus", "nuclear", "radioactive", "alpha decay", "beta decay", "gamma", "nucleon"]),

    ("Semiconductor Electronics", 2,
     ["p-n junction", "pn junction", "zener", "rectifier", "forward bias", "reverse bias",
      "depletion region", "logic gate", "nand", "nor", "truth table", "doping", "intrinsic semiconductor",
      "extrinsic semiconductor", "valence band", "conduction band", "forbidden energy gap",
      "barrier potential", "light emitting diode", "photodiode", "transistor"],
     ["diode", "semiconductor", "n-type", "p-type", "hole", "band gap", "silicon", "germanium"]),
]

CHEMISTRY = [
    ("Some Basic Concepts of Chemistry", 1,
     ["mole concept", "empirical formula", "molecular formula", "limiting reagent",
      "stoichiometry", "molarity", "molality", "mass percent", "avogadro number",
      "percentage composition", "equivalent weight"],
     ["mole", "molar mass", "atomic mass", "gram", "concentration", "dilut"]),

    ("Structure of Atom", 1,
     ["quantum number", "aufbau", "hund", "pauli exclusion", "heisenberg", "de broglie",
      "orbital angular momentum", "electronic configuration", "bohr", "photoelectric",
      "azimuthal", "radial node", "shielding effect", "schrodinger"],
     ["orbital", "electron", "shell", "subshell", "spin", "nucleus", "isotope", "spectrum"]),

    ("Classification of Elements and Periodicity", 1,
     ["ionisation enthalpy", "ionization enthalpy", "electron gain enthalpy", "electronegativity",
      "atomic radius", "ionic radius", "periodic table", "periodic trend", "lanthanoid contraction",
      "diagonal relationship"],
     ["period", "group", "across the period", "down the group", "representative element"]),

    ("Chemical Bonding and Molecular Structure", 1,
     ["vsepr", "hybridisation", "hybridization", "molecular orbital", "bond order", "resonance structure",
      "dipole moment", "sigma bond", "pi bond", "hydrogen bond", "lattice enthalpy", "fajans",
      "bond angle", "bond length", "octet rule", "lewis structure", "sp3", "sp2"],
     ["covalent", "ionic bond", "polar", "geometry", "linear", "tetrahedral", "trigonal", "bonding"]),

    ("States of Matter", 1,
     ["boyle's law", "charles law", "gay lussac", "dalton's law of partial", "van der waals",
      "critical temperature", "compressibility factor", "graham's law", "kinetic molecular",
      "surface tension", "viscosity of liquid"],
     ["ideal gas", "real gas", "vapour pressure", "gas constant", "pressure of the gas"]),

    ("Thermodynamics", 1,
     ["enthalpy of formation", "enthalpy of combustion", "hess's law", "gibbs free energy",
      "entropy change", "internal energy change", "bond enthalpy", "spontaneity",
      "first law of thermodynamics", "state function", "calorimeter", "standard enthalpy"],
     ["enthalpy", "entropy", "exothermic", "endothermic", "adiabatic", "isothermal", "system",
      "surroundings", "heat absorbed"]),

    ("Equilibrium", 1,
     ["le chatelier", "equilibrium constant", "solubility product", "common ion effect",
      "buffer solution", "henderson", "ionic product of water", "degree of dissociation",
      "ph of the solution", "conjugate acid", "conjugate base", "bronsted", "lewis acid",
      "hydrolysis of salt", "ksp"],
     ["equilibrium", "ph", "acid", "base", "dissociation", "kc", "kp", "weak acid", "strong acid"]),

    ("Redox Reactions", 1,
     ["oxidation number", "oxidation state", "disproportionation", "balancing redox",
      "oxidising agent", "reducing agent", "half reaction"],
     ["redox", "oxidation", "reduction", "oxidised", "reduced"]),

    ("Hydrogen", 1,
     ["heavy water", "hydrogen peroxide", "hydride", "water gas", "syngas", "hard water",
      "temporary hardness", "permanent hardness", "ortho hydrogen", "para hydrogen"],
     ["hydrogen", "deuterium", "tritium"]),

    ("s-Block Elements", 1,
     ["alkali metal", "alkaline earth", "plaster of paris", "washing soda", "baking soda",
      "quick lime", "slaked lime", "solvay", "down's cell", "castner", "gypsum",
      "sodium carbonate", "caustic soda"],
     ["lithium", "sodium", "potassium", "caesium", "magnesium", "calcium", "barium", "strontium"]),

    ("p-Block Elements (Group 13-14)", 1,
     ["borax", "diborane", "orthoboric acid", "boric acid", "silicones", "zeolite", "producer gas",
      "inert pair effect", "catenation", "fullerene", "graphite structure", "silicates",
      "aluminium chloride"],
     ["boron", "aluminium", "carbon", "silicon", "tin", "lead", "group 13", "group 14", "allotrope"]),

    ("Organic Chemistry - Basic Principles", 1,
     ["inductive effect", "hyperconjugation", "electrophile", "nucleophile", "carbocation",
      "carbanion", "free radical", "homolytic", "heterolytic", "iupac name", "iupac nomenclature",
      "structural isomer", "chain isomer", "position isomer", "functional isomer", "metamerism",
      "tautomerism", "resonance effect", "mesomeric"],
     ["isomer", "nomenclature", "functional group", "intermediate", "stability of"]),

    ("Hydrocarbons", 1,
     ["markovnikov", "anti markovnikov", "peroxide effect", "wurtz", "kolbe", "ozonolysis",
      "friedel craft", "sabatier", "baeyer's reagent", "lindlar", "aromaticity", "huckel",
      "electrophilic substitution", "alkane", "alkene", "alkyne", "benzene"],
     ["hydrocarbon", "unsaturated", "saturated", "addition reaction", "cracking", "toluene"]),

    ("Environmental Chemistry", 1,
     ["greenhouse", "ozone depletion", "photochemical smog", "acid rain", "biochemical oxygen demand",
      "bod", "eutrophication", "particulate", "global warming"],
     ["pollution", "pollutant", "atmosphere", "troposphere", "stratosphere"]),

    ("Solid State", 2,
     ["unit cell", "bravais", "packing efficiency", "coordination number of the lattice",
      "schottky", "frenkel", "f-centre", "body centred cubic", "face centred cubic",
      "hexagonal close pack", "tetrahedral void", "octahedral void", "crystal lattice",
      "density of the unit cell", "bcc", "fcc", "ccp", "hcp"],
     ["crystal", "lattice", "void", "amorphous", "crystalline", "defect"]),

    ("Solutions", 2,
     ["raoult", "colligative", "osmotic pressure", "elevation in boiling point",
      "depression in freezing point", "van't hoff factor", "molal elevation", "cryoscopic",
      "ebullioscopic", "henry's law", "azeotrope", "mole fraction", "abnormal molar mass",
      "relative lowering of vapour pressure"],
     ["solution", "solute", "solvent", "molality", "molarity", "ideal solution", "non ideal",
      "vapour pressure", "dissociation", "association"]),

    ("Electrochemistry", 2,
     ["nernst", "standard electrode potential", "galvanic cell", "electrolytic cell",
      "molar conductivity", "kohlrausch", "faraday's law of electrolysis", "salt bridge",
      "fuel cell", "lead storage battery", "corrosion", "emf of the cell", "cell potential",
      "specific conductance", "limiting molar conductivity"],
     ["electrode", "anode", "cathode", "electrolysis", "conductivity", "half cell", "oxidation potential"]),

    ("Chemical Kinetics", 2,
     ["rate constant", "order of the reaction", "molecularity", "half life of the reaction",
      "arrhenius", "activation energy", "pseudo first order", "rate law", "zero order",
      "first order reaction", "collision theory", "threshold energy", "rate determining step"],
     ["rate of reaction", "catalyst", "temperature coefficient", "concentration of reactant"]),

    ("Surface Chemistry", 2,
     ["physisorption", "chemisorption", "freundlich", "colloid", "tyndall", "brownian movement",
      "emulsion", "micelle", "peptisation", "hardy schulze", "electrophoresis", "zeta potential",
      "lyophilic", "lyophobic", "dialysis", "coagulation"],
     ["adsorption", "adsorbent", "adsorbate", "sol", "gel", "catalysis", "surface"]),

    ("Isolation of Elements (Metallurgy)", 2,
     ["froth flotation", "calcination", "roasting", "smelting", "zone refining", "van arkel",
      "mond process", "cupellation", "ellingham", "leaching", "electrolytic refining",
      "blast furnace", "slag", "flux", "gangue"],
     ["ore", "metallurgy", "concentration of ore", "extraction of metal", "bauxite", "haematite"]),

    ("p-Block Elements (Group 15-18)", 2,
     ["ostwald", "contact process", "haber", "oleum", "aqua regia", "interhalogen",
      "noble gas", "xenon", "bleaching powder", "nitric acid", "sulphuric acid", "phosphine",
      "ammonia", "allotropes of phosphorus", "group 15", "group 16", "group 17", "group 18",
      "halogen", "chalcogen"],
     ["nitrogen", "phosphorus", "sulphur", "oxygen", "chlorine", "bromine", "iodine", "fluorine",
      "argon", "helium", "neon", "krypton"]),

    ("d- and f-Block Elements", 2,
     ["transition element", "lanthanoid", "actinoid", "lanthanide contraction", "interstitial compound",
      "potassium dichromate", "potassium permanganate", "misch metal", "magnetic moment of the ion",
      "variable oxidation state", "inner transition"],
     ["d-block", "f-block", "transition metal", "unpaired electron", "catalytic property",
      "coloured ion", "manganese", "chromium", "iron", "copper", "zinc"]),

    ("Coordination Compounds", 2,
     ["crystal field", "ligand", "werner", "chelate", "denticate", "didentate", "ambidentate",
      "spectrochemical series", "linkage isomer", "ionisation isomer", "geometrical isomer",
      "optical isomer", "coordination sphere", "crystal field splitting", "inner orbital complex",
      "outer orbital complex", "ethane-1, 2-diamine", "ethylenediamine", "edta",
      "coordination number of the complex", "organometallic"],
     ["complex", "coordination", "central metal", "high spin", "low spin", "octahedral complex",
      "square planar", "nomenclature of complex"]),

    ("Haloalkanes and Haloarenes", 2,
     ["sn1", "sn2", "haloalkane", "haloarene", "chlorobenzene", "freon", "ddt", "chloroform",
      "iodoform", "finkelstein", "swarts", "grignard reagent", "wurtz fittig", "sandmeyer",
      "nucleophilic substitution", "alkyl halide", "aryl halide", "racemisation", "walden"],
     ["halide", "chloride", "bromide", "iodide", "optical activity", "chiral", "enantiomer"]),

    ("Alcohols, Phenols and Ethers", 2,
     ["williamson", "kolbe's reaction", "reimer tiemann", "lucas test", "victor meyer",
      "phenol", "ethanol", "methanol", "glycol", "esterification", "dehydration of alcohol",
      "friedel crafts on phenol", "cumene"],
     ["alcohol", "ether", "hydroxyl", "primary alcohol", "secondary alcohol", "tertiary alcohol",
      "oxidation of alcohol"]),

    ("Aldehydes, Ketones and Carboxylic Acids", 2,
     ["aldol", "cannizzaro", "tollens", "fehling", "clemmensen", "wolff kishner", "rosenmund",
      "stephen reaction", "gattermann", "hvz", "hell volhard", "etard", "haloform",
      "benzaldehyde", "acetophenone", "carboxylic acid", "acid anhydride", "acyl chloride",
      "nucleophilic addition", "decarboxylation"],
     ["aldehyde", "ketone", "carbonyl", "formaldehyde", "acetone", "acetic acid", "ester",
      "oxidation to acid"]),

    ("Amines", 2,
     ["hoffmann bromamide", "gabriel phthalimide", "carbylamine", "hinsberg", "diazonium",
      "coupling reaction", "aniline", "azo dye", "primary amine", "secondary amine",
      "tertiary amine", "basicity of amines"],
     ["amine", "amino", "nitro compound", "nitrogen containing", "diazo"]),

    ("Biomolecules", 2,
     ["glucose", "fructose", "sucrose", "maltose", "lactose", "starch", "cellulose", "glycogen",
      "amino acid", "peptide bond", "zwitter ion", "denaturation", "enzyme", "vitamin",
      "nucleic acid", "dna", "rna", "anomer", "epimer", "mutarotation", "glycosidic",
      "monosaccharide", "polysaccharide", "protein structure"],
     ["carbohydrate", "protein", "hormone", "nucleotide", "biomolecule", "reducing sugar"]),

    ("Polymers", 2,
     ["addition polymerisation", "condensation polymerisation", "copolymer", "nylon", "bakelite",
      "teflon", "pvc", "buna", "terylene", "dacron", "neoprene", "vulcanisation",
      "ziegler natta", "biodegradable polymer", "monomer of"],
     ["polymer", "polymerisation", "polymerization", "monomer", "thermoplastic", "thermosetting",
      "rubber", "resin"]),

    ("Chemistry in Everyday Life", 2,
     ["antibiotic", "analgesic", "antiseptic", "disinfectant", "antacid", "antihistamine",
      "tranquilizer", "antifertility", "artificial sweetener", "saccharin", "aspartame",
      "detergent", "soap", "food preservative", "broad spectrum", "narrow spectrum"],
     ["drug", "medicine", "therapeutic", "sedative", "antimicrobial"]),
]

MATHEMATICS = [
    ("Sets", 1,
     ["universal set", "power set", "venn diagram", "cardinality of the set", "subsets of a set",
      "complement of the set", "disjoint set", "a union b", "a intersection b"],
     ["set", "element of", "union", "intersection", "null set", "finite set", "subset",
      "elements common", "a x b", "b x a", "roster", "number of subsets"]),

    ("Relations and Functions", 1,
     ["equivalence relation", "reflexive", "symmetric", "transitive", "one one", "onto",
      "bijective", "injective", "surjective", "domain of the function", "range of the function",
      "composite function", "inverse of the function", "binary operation", "cartesian product"],
     ["relation", "function", "mapping", "codomain", "f(x)", "signum", "greatest integer",
      "binary operation", "domain", "range", "injective", "surjective", "bijective"]),

    ("Trigonometric Functions", 1,
     ["trigonometric equation", "general solution", "sin a cos b", "law of sines", "law of cosines",
      "principal solution", "compound angle", "multiple angle", "height and distance",
      "sin x + cos x", "tan x", "period of the function"],
     ["sin", "cos", "tan", "cot", "sec", "cosec", "trigonometric", "degree", "radian", "angle"]),

    ("Complex Numbers and Quadratic Equations", 1,
     ["complex number", "argand", "modulus of z", "amplitude of z", "argument of z",
      "conjugate of the complex", "cube root of unity", "de moivre", "purely imaginary",
      "roots of the quadratic", "discriminant", "sum of the roots", "product of the roots"],
     ["iota", "imaginary", "real part", "imaginary part", "quadratic", "polar form", "z =",
      "conjugate", "polynomial", "roots of the equation", "is a factor of", "zeroes of the polynomial"]),

    ("Linear Inequalities", 1,
     ["system of linear inequalities", "graphical solution of inequalit", "solution set of the inequality"],
     ["inequality", "inequalities", "greater than", "less than"]),

    ("Permutations and Combinations", 1,
     ["permutation", "combination", "factorial", "number of ways", "arrangement of letters",
      "circular permutation", "selection of", "ncr", "npr", "no two are together",
      "number of arrangements"],
     ["arranged", "chosen", "distinct objects", "committee", "digits", "ways", "polygon",
      "octagon", "number of diagonals", "number of triangles", "ncr", "npr"]),

    ("Binomial Theorem", 1,
     ["binomial expansion", "binomial theorem", "general term in the expansion",
      "middle term in the expansion", "coefficient of x", "independent of x", "binomial coefficient",
      "term free from"],
     ["expansion of", "pascal"]),

    ("Sequences and Series", 1,
     ["arithmetic progression", "geometric progression", "harmonic progression", "arithmetic mean",
      "geometric mean", "sum to n terms", "sum of n terms", "common difference", "common ratio",
      "infinite geometric", "nth term of the ap", "middle term of the ap", "sum of first"],
     ["progression", " ap ", " gp ", " hp ", "series", "sequence", "terms are in"]),

    ("Straight Lines", 1,
     ["slope of the line", "equation of the straight line", "perpendicular distance from the point",
      "angle between the lines", "point of intersection of lines", "concurrent lines",
      "family of lines", "intercept form", "normal form of the line", "locus of the point"],
     ["straight line", "collinear", "parallel to the line", "perpendicular to the line",
      "x-axis", "y-axis", "intercept", "slope", "locus", "pair of lines", "hxy",
      "reflection of the point", "centroid", "midpoints of the sides", "orthocentre"]),

    ("Conic Sections", 1,
     ["eccentricity", "latus rectum", "directrix", "focus of the parabola", "parabola",
      "ellipse", "hyperbola", "asymptote", "equation of the circle", "centre of the circle",
      "radius of the circle", "tangent to the circle", "conic"],
     ["circle", "focal", "vertex", "conjugate axis", "transverse axis", "major axis", "minor axis"]),

    ("Introduction to Three Dimensional Geometry", 1,
     ["distance between two points in space", "section formula in 3d", "octant",
      "direction cosines", "direction ratios"],
     ["coordinates of the point", "xy-plane", "yz-plane", "zx-plane", "3d"]),

    ("Limits and Derivatives", 1,
     ["evaluate the limit", "left hand limit", "right hand limit", "limit as x tends",
      "first principle", "derivative of the function from first"],
     ["limit", "tends to", "lim"]),

    ("Mathematical Reasoning", 1,
     ["contrapositive", "converse of the statement", "negation of the statement", "tautology",
      "truth value", "compound statement", "quantifier", "if and only if", "validity of the statement",
      "logically equivalent", "statement 1", "statement 2"],
     ["statement", "implication", "proposition", "truth table", "negation", "contradiction",
      "can also be written as", "disjunction", "conjunction"]),

    ("Statistics", 1,
     ["standard deviation", "variance", "mean deviation", "coefficient of variation",
      "median of the data", "mode of the data", "arithmetic mean of the observations",
      "quartile deviation"],
     ["mean", "median", "mode", "observations", "frequency distribution", "data"]),

    ("Probability", 1,
     ["conditional probability", "bayes", "mutually exclusive", "independent events",
      "random variable", "binomial distribution", "probability distribution", "mean of the distribution",
      "bernoulli", "at least one", "total probability", "sample space", "odds in favour"],
     ["probability", "event", "dice", "coin tossed", "drawn at random", "p(a)", "p(b)"]),

    ("Inverse Trigonometric Functions", 2,
     ["inverse trigonometric", "principal value branch", "sin inverse", "cos inverse", "tan inverse",
      "arcsin", "arccos", "arctan", "principal value of"],
     ["inverse of sin", "inverse function of"]),

    ("Matrices", 2,
     ["symmetric matrix", "skew symmetric", "transpose of the matrix", "identity matrix",
      "scalar matrix", "diagonal matrix", "idempotent", "nilpotent", "involutory", "orthogonal matrix",
      "elementary transformation", "order of the matrix", "matrix multiplication"],
     ["matrix", "matrices", "rows and columns", "element of the matrix", "invertible",
      "pre multiply", "post multiply", "main diagonal", "trace of the matrix"]),

    ("Determinants", 2,
     ["determinant", "cofactor", "minor of the element", "adjoint", "inverse of the matrix",
      "cramer", "singular matrix", "non singular", "area of the triangle using determinant",
      "consistent system of equations"],
     ["det", "|a|", "adj", "system of linear equations"]),

    ("Continuity and Differentiability", 2,
     ["continuous at x", "differentiable at", "rolle", "lagrange mean value", "mean value theorem",
      "logarithmic differentiation", "parametric form differentiation", "second order derivative",
      "chain rule", "discontinuous at", "left hand derivative", "right hand derivative"],
     ["continuity", "differentiab", "derivative", "dy/dx", "f'(x)"]),

    ("Application of Derivatives", 2,
     ["rate of change", "increasing function", "decreasing function", "strictly increasing",
      "strictly decreasing", "maxima", "minima", "local maximum", "local minimum",
      "absolute maximum", "point of inflection", "tangent and normal", "approximation using derivative",
      "critical point", "monotonic"],
     ["maximum value", "minimum value", "slope of the tangent", "normal to the curve", "stationary",
      "subtangent", "subnormal", "is minimum", "is maximum", "greatest value", "least value",
      "tangent to the curve", "cut orthogonally", "intersect orthogonally", "cuts the coordinate axes",
      "angular displacement", "rate at which", "approximation"]),

    ("Integrals", 2,
     ["indefinite integral", "definite integral", "integration by parts", "partial fraction",
      "integration by substitution", "antiderivative", "properties of definite integral",
      "evaluate the integral"],
     ["integral", "integrat", "dx", "antideriv"]),

    ("Application of Integrals", 2,
     ["area bounded by the curve", "area under the curve", "area of the region", "area enclosed"],
     ["area between", "bounded region"]),

    ("Differential Equations", 2,
     ["order and degree of the differential", "integrating factor", "variable separable",
      "homogeneous differential equation", "linear differential equation", "general solution of the differential",
      "particular solution of the differential", "formation of differential equation"],
     ["differential equation", "order of the differential", "degree of the differential"]),

    ("Vector Algebra", 2,
     ["scalar triple product", "vector triple product", "dot product", "cross product",
      "coplanar vectors", "projection of the vector", "unit vector", "position vector",
      "collinear vectors", "direction cosines of the vector", "magnitude of the vector"],
     ["vector", "i + j + k", "scalar product", "vector product", "perpendicular vectors",
      "parallelogram", "adjacent sides", "diagonals", "unit vectors", "area of the parallelogram"]),

    ("Three Dimensional Geometry", 2,
     ["shortest distance between the lines", "skew lines", "angle between two planes",
      "equation of the plane", "cartesian equation of the line", "distance of the point from the plane",
      "direction ratios of the line", "foot of the perpendicular", "image of the point in the plane",
      "coplanar lines"],
     ["plane", "line in space", "normal to the plane", "direction cosine"]),

    ("Linear Programming", 2,
     ["linear programming", "objective function", "feasible region", "corner point",
      "constraints", "maximise z", "minimise z", "optimal solution", "lpp"],
     ["feasible", "maximize", "minimize", "subject to"]),
]

SUBJECTS = {"Physics": PHYSICS, "Chemistry": CHEMISTRY, "Mathematics": MATHEMATICS}


def chapter_list(subject):
    return [{"name": n, "puc": c} for (n, c, _s, _w) in SUBJECTS[subject]]
