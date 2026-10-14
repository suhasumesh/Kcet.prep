/**
 * Topics and the governing formula inside each syllabus chapter.
 *
 * `chapter` tells a student which part of the book to open. It does not tell
 * them what to practise: "Current Electricity, 90 questions" is a term's work,
 * while "Kirchhoff's laws, 18 questions, always the same loop equation" is an
 * evening's. This table carries that second level.
 *
 * `keywords` place a question inside a topic, scored the way chapters are.
 * `formula` is the relation the topic actually tests, written as a student
 * would put it on a revision card, and shown beside the count so a chapter's
 * pattern reads as "this came up nine times, and every time it was this".
 *
 * Depth is proportional to how often a chapter is examined. A chapter absent
 * from this table still reports at chapter level; a question matching none of
 * its chapter's topics is counted under the chapter but outside any topic,
 * which the report states rather than hides.
 *
 * Authored by hand. Keep the keywords lowercase.
 */
export type Topic = { topic: string; keywords: string[]; formula: string };

export const TOPICS: Record<string, Record<string, Topic[]>> = {
  "Physics": {
    "Current Electricity": [
      {
        "topic": "Ohm's law, resistivity and drift",
        "keywords": [
          "ohm's law",
          "resistivity",
          "specific resistance",
          "drift velocity",
          "mobility",
          "relaxation time",
          "current density",
          "ohmic"
        ],
        "formula": "V = IR · ρ = RA/L · I = nAev_d"
      },
      {
        "topic": "Series and parallel networks",
        "keywords": [
          "effective resistance",
          "equivalent resistance",
          "resistance in series",
          "resistance in parallel",
          "network",
          "between a and b"
        ],
        "formula": "series R = R₁+R₂ · parallel 1/R = 1/R₁+1/R₂"
      },
      {
        "topic": "Kirchhoff's laws",
        "keywords": [
          "kirchhoff",
          "junction",
          "loop rule",
          "values of currents",
          "value of i"
        ],
        "formula": "ΣI = 0 at a junction · ΣV = 0 round a loop"
      },
      {
        "topic": "Wheatstone bridge, meter bridge and potentiometer",
        "keywords": [
          "wheatstone",
          "meter bridge",
          "potentiometer",
          "balancing length",
          "balance point",
          "null point"
        ],
        "formula": "P/Q = R/S at balance · E₁/E₂ = l₁/l₂"
      },
      {
        "topic": "Cells, emf and internal resistance",
        "keywords": [
          "internal resistance",
          "emf of the cell",
          "terminal voltage",
          "cells in series",
          "cells in parallel"
        ],
        "formula": "ε = I(R + r) · V = ε − Ir"
      },
      {
        "topic": "Electrical power and heating",
        "keywords": [
          "power dissipated",
          "heat produced",
          "joule's law",
          "watt",
          "kilowatt hour",
          "power consumed",
          "bulb rated"
        ],
        "formula": "P = VI = I²R = V²/R"
      },
      {
        "topic": "Galvanometer, ammeter and voltmeter",
        "keywords": [
          "galvanometer",
          "ammeter",
          "voltmeter",
          "shunt",
          "full scale deflection",
          "converted into"
        ],
        "formula": "shunt S = I_gG/(I−I_g) · series R = V/I_g − G"
      },
      {
        "topic": "Temperature dependence of resistance",
        "keywords": [
          "temperature coefficient",
          "temperature co-efficient",
          "variation of resistance"
        ],
        "formula": "R_t = R₀(1 + αΔT)"
      }
    ],
    "Ray Optics and Optical Instruments": [
      {
        "topic": "Reflection and mirrors",
        "keywords": [
          "mirror formula",
          "concave mirror",
          "convex mirror",
          "pole",
          "mirror"
        ],
        "formula": "1/v + 1/u = 1/f · m = −v/u"
      },
      {
        "topic": "Refraction, apparent depth and TIR",
        "keywords": [
          "refractive index",
          "apparent depth",
          "real depth",
          "normal shift",
          "total internal reflection",
          "critical angle",
          "optical fibre",
          "snell"
        ],
        "formula": "μ = sin i/sin r · apparent depth = real/μ · sin C = 1/μ"
      },
      {
        "topic": "Lenses, lens maker and combinations",
        "keywords": [
          "lens maker",
          "focal length",
          "power of the lens",
          "combination of lenses",
          "lenses in contact",
          "convex lens",
          "concave lens",
          "radius of curvature"
        ],
        "formula": "1/v − 1/u = 1/f · 1/f = (μ−1)(1/R₁−1/R₂) · P = 1/f"
      },
      {
        "topic": "Prism and dispersion",
        "keywords": [
          "prism",
          "angle of minimum deviation",
          "dispersive power",
          "angle of prism",
          "dispersion"
        ],
        "formula": "μ = sin((A+δ_m)/2)/sin(A/2) · δ = (μ−1)A"
      },
      {
        "topic": "Microscope and telescope",
        "keywords": [
          "magnifying power",
          "compound microscope",
          "astronomical telescope",
          "eyepiece",
          "objective",
          "simple microscope",
          "telescope"
        ],
        "formula": "microscope M = (L/f_o)(D/f_e) · telescope M = f_o/f_e"
      },
      {
        "topic": "Sign convention and image formation",
        "keywords": [
          "cartesian sign convention",
          "sign convention",
          "image formed",
          "object is placed"
        ],
        "formula": "distances measured along the incident ray are positive"
      }
    ],
    "Electric Charges and Fields": [
      {
        "topic": "Coulomb's law",
        "keywords": [
          "coulomb's law",
          "electrostatic force",
          "force between two charges",
          "allowed to touch",
          "identical spheres"
        ],
        "formula": "F = (1/4πε₀)·q₁q₂/r²"
      },
      {
        "topic": "Electric field of point charges",
        "keywords": [
          "electric field intensity",
          "electric field at a point",
          "field due to",
          "null point",
          "uniform electric field"
        ],
        "formula": "E = (1/4πε₀)·q/r² · F = qE"
      },
      {
        "topic": "Electric dipole",
        "keywords": [
          "electric dipole",
          "dipole moment",
          "axial line",
          "equatorial line",
          "torque on dipole"
        ],
        "formula": "axial E = 2kp/r³ · equatorial E = kp/r³ · τ = pE sin θ"
      },
      {
        "topic": "Gauss's law and flux",
        "keywords": [
          "gauss",
          "electric flux",
          "gaussian surface",
          "area vector",
          "charge enclosed",
          "flux through"
        ],
        "formula": "Φ = ∮E·dA = q_enc/ε₀"
      },
      {
        "topic": "Charge quantisation and conservation",
        "keywords": [
          "excess electrons",
          "number of electrons",
          "quantisation of charge",
          "conservation of charge"
        ],
        "formula": "q = ne, e = 1·6 × 10⁻¹⁹ C"
      },
      {
        "topic": "Field of continuous distributions",
        "keywords": [
          "linear charge density",
          "surface charge density",
          "infinite sheet",
          "charged sphere",
          "spherical shell"
        ],
        "formula": "sheet E = σ/2ε₀ · wire E = λ/2πε₀r"
      }
    ],
    "Work, Energy and Power": [
      {
        "topic": "Work done by a force",
        "keywords": [
          "work done by a force",
          "work done against",
          "work energy theorem",
          "displacement",
          "force acting",
          "work done in moving",
          "work done is",
          "work done by"
        ],
        "formula": "W = F·s cos θ · W_net = ΔK"
      },
      {
        "topic": "Kinetic and potential energy",
        "keywords": [
          "kinetic energy",
          "potential energy",
          "conservation of energy",
          "energy stored in a spring",
          "spring constant"
        ],
        "formula": "K = ½mv² = p²/2m · U = mgh · U_spring = ½kx²"
      },
      {
        "topic": "Collisions",
        "keywords": [
          "elastic collision",
          "inelastic collision",
          "coefficient of restitution",
          "head on collision",
          "loss of kinetic energy",
          "collision",
          "two bodies collide",
          "after collision",
          "perfectly elastic",
          "perfectly inelastic",
          "collide with"
        ],
        "formula": "elastic: momentum and KE conserved · e = v_sep/v_app"
      },
      {
        "topic": "Explosions and recoil",
        "keywords": [
          "explodes into",
          "fragment",
          "recoil",
          "gun",
          "shell"
        ],
        "formula": "momentum conserved: m₁v₁ = m₂v₂ · K = p²/2m"
      },
      {
        "topic": "Power",
        "keywords": [
          "power of the pump",
          "power delivered",
          "average power",
          "efficiency of the motor",
          "watt",
          "horse power",
          "power of an engine",
          "rate of doing work",
          "power required"
        ],
        "formula": "P = W/t = F·v"
      }
    ],
    "Motion in a Straight Line": [
      {
        "topic": "Equations of uniformly accelerated motion",
        "keywords": [
          "uniformly accelerated",
          "retardation",
          "initial velocity",
          "comes to rest",
          "distance travelled in the nth second",
          "starts from rest",
          "uniform acceleration",
          "travels a distance",
          "velocity of the body",
          "acceleration of the"
        ],
        "formula": "v = u+at · s = ut+½at² · v² = u²+2as"
      },
      {
        "topic": "Free fall under gravity",
        "keywords": [
          "free fall",
          "stone is dropped",
          "thrown vertically",
          "dropped from a balloon",
          "height of the tower",
          "ball is dropped"
        ],
        "formula": "h = ½gt² · v = √(2gh)"
      },
      {
        "topic": "Graphs of motion",
        "keywords": [
          "velocity time graph",
          "displacement time",
          "position time",
          "area under the graph",
          "slope of the graph",
          "graph between",
          "the graph"
        ],
        "formula": "slope of v–t = a · area under v–t = s"
      },
      {
        "topic": "Relative velocity",
        "keywords": [
          "relative velocity",
          "escalator",
          "overtake",
          "with respect to"
        ],
        "formula": "v_AB = v_A − v_B"
      },
      {
        "topic": "Average speed and velocity",
        "keywords": [
          "average velocity",
          "average speed",
          "instantaneous velocity"
        ],
        "formula": "v_avg = total displacement / total time"
      }
    ],
    "Nuclei": [
      {
        "topic": "Radioactive decay and half-life",
        "keywords": [
          "half life",
          "half-life",
          "decay constant",
          "mean life",
          "activity",
          "radio-active sample",
          "fraction that will decay",
          "number of nuclei"
        ],
        "formula": "N = N₀e^(−λt) · t½ = 0·693/λ · τ = 1/λ"
      },
      {
        "topic": "Binding energy and mass defect",
        "keywords": [
          "binding energy",
          "mass defect",
          "packing fraction",
          "binding energy per nucleon"
        ],
        "formula": "Δm = Zm_p + Nm_n − M · E = Δmc² · 1 u = 931·5 MeV"
      },
      {
        "topic": "Fission and fusion",
        "keywords": [
          "nuclear fission",
          "nuclear fusion",
          "chain reaction",
          "nuclear reactor",
          "moderator",
          "breeder",
          "energy released"
        ],
        "formula": "Q = BE(products) − BE(reactants)"
      },
      {
        "topic": "Decay series, alpha and beta emission",
        "keywords": [
          "alpha decay",
          "beta decay",
          "gamma",
          "particles emitted",
          "daughter nucleus",
          "atomic number",
          "mass number"
        ],
        "formula": "α: A−4, Z−2 · β⁻: Z+1 · γ: no change"
      },
      {
        "topic": "Nuclear size, density and isotopes",
        "keywords": [
          "nuclear density",
          "radius of the nucleus",
          "isotope",
          "isobar",
          "isotone"
        ],
        "formula": "R = R₀A^(1/3), R₀ = 1·2 fm · density ≈ 2·3 × 10¹⁷ kg m⁻³"
      }
    ],
    "Wave Optics": [
      {
        "topic": "Young's double slit",
        "keywords": [
          "young's double slit",
          "fringe width",
          "double slit",
          "path difference",
          "bright fringe",
          "dark fringe",
          "coherent source"
        ],
        "formula": "β = λD/d · maxima: path diff = nλ"
      },
      {
        "topic": "Single slit diffraction",
        "keywords": [
          "single slit",
          "central maxima",
          "diffraction pattern",
          "width of central"
        ],
        "formula": "a sin θ = nλ · central width = 2λD/a"
      },
      {
        "topic": "Polarisation",
        "keywords": [
          "polarisation",
          "polarization",
          "brewster",
          "malus",
          "polaroid",
          "unpolarised"
        ],
        "formula": "I = I₀cos²θ · tan i_B = μ"
      },
      {
        "topic": "Huygens principle and wavefronts",
        "keywords": [
          "huygens",
          "wavefront",
          "wave front",
          "secondary wavelet"
        ],
        "formula": "every point on a wavefront is a source of secondary wavelets"
      },
      {
        "topic": "Resolving power and Fresnel distance",
        "keywords": [
          "resolving power",
          "fresnel distance",
          "ray optics is good approximation",
          "aperture",
          "limit of resolution"
        ],
        "formula": "θ = 1·22λ/D · Z_F = a²/λ"
      },
      {
        "topic": "Interference conditions and intensity",
        "keywords": [
          "interference",
          "constructive",
          "destructive",
          "intensity of",
          "coherent"
        ],
        "formula": "I = I₁+I₂+2√(I₁I₂)cos δ · I_max/I_min = (a₁+a₂)²/(a₁−a₂)²"
      }
    ],
    "Semiconductor Electronics": [
      {
        "topic": "Logic gates",
        "keywords": [
          "logic gate",
          "nand",
          "nor",
          "truth table",
          "universal",
          "and gate",
          "or gate",
          "not gate",
          "xor"
        ],
        "formula": "NAND and NOR are universal · De Morgan: (A·B)′ = A̅+B̅"
      },
      {
        "topic": "p-n junction and diode",
        "keywords": [
          "p-n junction",
          "pn junction",
          "forward bias",
          "reverse bias",
          "depletion region",
          "barrier potential",
          "diode"
        ],
        "formula": "depletion widens in reverse bias · I = I₀(e^(eV/kT) − 1)"
      },
      {
        "topic": "Rectifiers and filters",
        "keywords": [
          "rectifier",
          "ripple",
          "filter",
          "regulator",
          "full wave",
          "half wave"
        ],
        "formula": "half-wave: one half cycle · full-wave: both · output frequency 2f"
      },
      {
        "topic": "Transistors and amplifiers",
        "keywords": [
          "transistor",
          "common emitter",
          "current gain",
          "amplifier",
          "collector",
          "base"
        ],
        "formula": "β = I_C/I_B · A_V = β·R_L/R_i"
      },
      {
        "topic": "Bands, doping and intrinsic/extrinsic",
        "keywords": [
          "valence band",
          "conduction band",
          "forbidden energy gap",
          "band gap",
          "doping",
          "intrinsic",
          "extrinsic",
          "n-type",
          "p-type",
          "majority carrier"
        ],
        "formula": "n_e·n_h = n_i² · conductor ≈ 0, semiconductor 0·2–3 eV, insulator > 3 eV"
      },
      {
        "topic": "Zener diode, LED and photodiode",
        "keywords": [
          "zener",
          "light emitting diode",
          "photodiode",
          "solar cell",
          "led"
        ],
        "formula": "Zener regulates in breakdown · LED: λ = hc/E_g"
      }
    ],
    "Electrostatic Potential and Capacitance": [
      {
        "topic": "Electric potential and potential energy",
        "keywords": [
          "electrostatic potential",
          "potential at a point",
          "potential difference",
          "work done to move a charge",
          "electric potential energy",
          "equipotential"
        ],
        "formula": "V = kq/r · U = kq₁q₂/r · W = q(V₂−V₁)"
      },
      {
        "topic": "Capacitance of a parallel plate capacitor",
        "keywords": [
          "parallel plate capacitor",
          "capacitance",
          "area of the plates",
          "separation"
        ],
        "formula": "C = ε₀A/d · Q = CV"
      },
      {
        "topic": "Capacitors in series and parallel",
        "keywords": [
          "capacitors in series",
          "capacitors in parallel",
          "effective capacitance",
          "gang capacitor",
          "combination of capacitors"
        ],
        "formula": "series 1/C = Σ1/Cᵢ · parallel C = ΣCᵢ"
      },
      {
        "topic": "Energy stored in a capacitor",
        "keywords": [
          "energy stored",
          "energy density"
        ],
        "formula": "U = ½CV² = ½QV = Q²/2C"
      },
      {
        "topic": "Dielectrics",
        "keywords": [
          "dielectric constant",
          "dielectric",
          "polarisation of the medium"
        ],
        "formula": "C′ = KC · E′ = E/K"
      }
    ],
    "Moving Charges and Magnetism": [
      {
        "topic": "Biot-Savart and field of loops",
        "keywords": [
          "biot savart",
          "magnetic field at the centre",
          "circular coil",
          "current loop",
          "magnetic induction at the point",
          "arc"
        ],
        "formula": "B = μ₀I/2R at centre · B = μ₀I/4πr·(dl×r̂)"
      },
      {
        "topic": "Ampere's law, solenoid and toroid",
        "keywords": [
          "ampere's circuital",
          "solenoid",
          "toroid",
          "long straight conductor"
        ],
        "formula": "B = μ₀nI (solenoid) · B = μ₀I/2πr (straight wire)"
      },
      {
        "topic": "Force on a moving charge",
        "keywords": [
          "lorentz force",
          "charged particle",
          "radius of the circular path",
          "helix",
          "velocity selector",
          "perpendicular to the field"
        ],
        "formula": "F = qvB sin θ · r = mv/qB = √(2mK)/qB · T = 2πm/qB"
      },
      {
        "topic": "Cyclotron",
        "keywords": [
          "cyclotron",
          "dees",
          "resonance condition"
        ],
        "formula": "f = qB/2πm · K_max = q²B²R²/2m"
      },
      {
        "topic": "Force between parallel currents",
        "keywords": [
          "force between two parallel",
          "parallel conductors",
          "force per unit length"
        ],
        "formula": "F/L = μ₀I₁I₂/2πd = 2×10⁻⁷ I₁I₂/d"
      },
      {
        "topic": "Torque on a loop and galvanometer",
        "keywords": [
          "torque on a current",
          "moving coil galvanometer",
          "current sensitivity"
        ],
        "formula": "τ = NIAB sin θ · I ∝ deflection"
      }
    ],
    "Waves": [
      {
        "topic": "Wave equation and wave speed",
        "keywords": [
          "wave equation",
          "transverse wave",
          "longitudinal wave",
          "progressive wave",
          "angular frequency",
          "wave number",
          "phase difference"
        ],
        "formula": "y = a sin(ωt − kx) · v = fλ = ω/k"
      },
      {
        "topic": "Stationary waves in strings",
        "keywords": [
          "sonometer",
          "string vibrat",
          "stationary wave",
          "standing wave",
          "node",
          "antinode",
          "law of lengths",
          "mersenne"
        ],
        "formula": "f = (1/2L)√(T/m) · f_n = nv/2L"
      },
      {
        "topic": "Organ pipes and resonance",
        "keywords": [
          "organ pipe",
          "closed pipe",
          "open pipe",
          "resonance tube",
          "harmonic",
          "overtone",
          "fundamental frequency",
          "end correction"
        ],
        "formula": "open f_n = nv/2L · closed f_n = (2n−1)v/4L"
      },
      {
        "topic": "Beats",
        "keywords": [
          "beats",
          "beat frequency",
          "tuning fork",
          "filed",
          "waxed",
          "unison"
        ],
        "formula": "beats = |f₁ − f₂|"
      },
      {
        "topic": "Doppler effect",
        "keywords": [
          "doppler",
          "apparent frequency",
          "approaching",
          "receding",
          "source moving",
          "observer moving"
        ],
        "formula": "f′ = f(v ± v_o)/(v ∓ v_s)"
      },
      {
        "topic": "Intensity, loudness and pitch",
        "keywords": [
          "intensity level",
          "decibel",
          "loudness",
          "pitch",
          "quality",
          "timbre"
        ],
        "formula": "L = 10 log₁₀(I/I₀), I₀ = 10⁻¹² W m⁻²"
      },
      {
        "topic": "Speed of sound",
        "keywords": [
          "speed of sound",
          "velocity of sound",
          "laplace",
          "newton's formula",
          "echo"
        ],
        "formula": "v = √(γP/ρ) · v = 331√(T/273) m s⁻¹"
      }
    ],
    "Alternating Current": [
      {
        "topic": "RMS and peak values",
        "keywords": [
          "rms value",
          "rms current",
          "rms voltage",
          "peak value",
          "virtual value",
          "average value",
          "reading of the ammeter"
        ],
        "formula": "I_rms = I₀/√2 · V_rms = V₀/√2"
      },
      {
        "topic": "Reactance and impedance",
        "keywords": [
          "reactance",
          "impedance",
          "capacitive",
          "inductive",
          "phase angle",
          "potential drop across"
        ],
        "formula": "X_L = ωL · X_C = 1/ωC · Z = √(R² + (X_L−X_C)²)"
      },
      {
        "topic": "LCR resonance",
        "keywords": [
          "resonant frequency",
          "lcr",
          "l-c-r",
          "quality factor",
          "resonance",
          "sharpness"
        ],
        "formula": "f₀ = 1/(2π√(LC)) · Q = ωL/R"
      },
      {
        "topic": "Power and power factor",
        "keywords": [
          "power factor",
          "wattless",
          "average power",
          "power consumed in ac"
        ],
        "formula": "P = V_rms I_rms cos φ · cos φ = R/Z"
      },
      {
        "topic": "Transformer",
        "keywords": [
          "transformer",
          "primary",
          "secondary",
          "step up",
          "step down",
          "turns ratio"
        ],
        "formula": "V_s/V_p = N_s/N_p · ideal V_pI_p = V_sI_s"
      }
    ],
    "Thermal Properties of Matter": [
      {
        "topic": "Thermal expansion",
        "keywords": [
          "linear expansion",
          "areal expansion",
          "cubical expansion",
          "thermal expansion",
          "coefficient of expansion"
        ],
        "formula": "ΔL = LαΔT · β = 2α · γ = 3α"
      },
      {
        "topic": "Calorimetry and latent heat",
        "keywords": [
          "calorimetry",
          "latent heat",
          "specific heat capacity",
          "mixture",
          "ice",
          "steam",
          "heat required"
        ],
        "formula": "Q = mcΔT · Q = mL · L_fusion 80, L_vap 540 cal g⁻¹"
      },
      {
        "topic": "Conduction",
        "keywords": [
          "thermal conductivity",
          "conduction",
          "rods",
          "heat current",
          "thermal resistance",
          "conduct most heat"
        ],
        "formula": "Q/t = kA(T₁−T₂)/L"
      },
      {
        "topic": "Newton's law of cooling",
        "keywords": [
          "newton's law of cooling",
          "cools from",
          "rate of cooling"
        ],
        "formula": "dT/dt ∝ (T − T_s)"
      },
      {
        "topic": "Radiation, Stefan and Wien",
        "keywords": [
          "stefan",
          "wien's displacement",
          "black body",
          "emissivity",
          "radiate maximum"
        ],
        "formula": "E = σT⁴ · λ_m T = 2·898 × 10⁻³ m K"
      }
    ],
    "Atoms": [
      {
        "topic": "Bohr model: radius, velocity, energy",
        "keywords": [
          "bohr radius",
          "radius of the orbit",
          "nth orbit",
          "orbit velocity",
          "angular momentum of the electron",
          "period of revolution"
        ],
        "formula": "r_n = 0·53n²/Z Å · v_n = 2·19×10⁶/n · L = nh/2π"
      },
      {
        "topic": "Energy levels and transitions",
        "keywords": [
          "energy level",
          "excited state",
          "ground state",
          "excitation energy",
          "ionisation energy",
          "transition",
          "energy required"
        ],
        "formula": "E_n = −13·6Z²/n² eV · ΔE = hc/λ · hc = 1240 eV nm"
      },
      {
        "topic": "Hydrogen spectral series",
        "keywords": [
          "balmer",
          "lyman",
          "paschen",
          "brackett",
          "rydberg",
          "hydrogen spectrum",
          "spectral line",
          "series"
        ],
        "formula": "1/λ = RZ²(1/n₁² − 1/n₂²), R = 1·097×10⁷ m⁻¹"
      },
      {
        "topic": "Rutherford scattering",
        "keywords": [
          "rutherford",
          "alpha particle scattering",
          "distance of closest approach",
          "gold foil",
          "impact parameter"
        ],
        "formula": "r₀ = 2kZe²/K"
      }
    ],
    "System of Particles and Rotational Motion": [
      {
        "topic": "Centre of mass",
        "keywords": [
          "centre of mass",
          "center of mass",
          "centroid"
        ],
        "formula": "x_cm = Σmᵢxᵢ/Σmᵢ"
      },
      {
        "topic": "Moment of inertia and theorems",
        "keywords": [
          "moment of inertia",
          "radius of gyration",
          "parallel axis",
          "perpendicular axis"
        ],
        "formula": "I = Σmr² · ring MR², disc ½MR², sphere ⅖MR² · I = I_cm + Md²"
      },
      {
        "topic": "Torque and angular momentum",
        "keywords": [
          "torque",
          "angular momentum",
          "conservation of angular momentum",
          "angular acceleration"
        ],
        "formula": "τ = Iα · L = Iω · τ = dL/dt"
      },
      {
        "topic": "Rolling motion",
        "keywords": [
          "rolling without slipping",
          "rolls down",
          "solid cylinder",
          "solid sphere",
          "inclined plane",
          "ring and disc"
        ],
        "formula": "K = ½mv²(1 + I/mR²) · a = g sin θ/(1 + I/mR²)"
      },
      {
        "topic": "Rotational kinetic energy",
        "keywords": [
          "rotational kinetic energy",
          "flywheel",
          "angular velocity"
        ],
        "formula": "K = ½Iω²"
      }
    ],
    "Magnetism and Matter": [
      {
        "topic": "Bar magnet and magnetic dipole",
        "keywords": [
          "bar magnet",
          "magnetic dipole moment",
          "pole strength",
          "magnetic moment",
          "vibration magnetometer"
        ],
        "formula": "M = m·2l · τ = MB sin θ · U = −MB cos θ"
      },
      {
        "topic": "Earth's magnetism",
        "keywords": [
          "earth's magnetic field",
          "angle of dip",
          "declination",
          "magnetic meridian",
          "horizontal component",
          "neutral point"
        ],
        "formula": "B_H = B cos δ · B_V = B sin δ · tan δ = B_V/B_H"
      },
      {
        "topic": "Magnetic materials and susceptibility",
        "keywords": [
          "diamagnetic",
          "paramagnetic",
          "ferromagnetic",
          "susceptibility",
          "permeability",
          "curie"
        ],
        "formula": "χ = M/H · μ_r = 1 + χ · χ ∝ 1/T (Curie)"
      },
      {
        "topic": "Hysteresis",
        "keywords": [
          "hysteresis",
          "retentivity",
          "coercivity",
          "remanence"
        ],
        "formula": "area of the loop = energy lost per cycle"
      }
    ],
    "Mechanical Properties of Fluids": [
      {
        "topic": "Pressure, Pascal and Archimedes",
        "keywords": [
          "pascal's law",
          "buoyancy",
          "upthrust",
          "archimedes",
          "floats",
          "immersed",
          "apparent loss of weight",
          "iceberg",
          "submerged",
          "hydraulic"
        ],
        "formula": "P = hρg · upthrust = V_sub ρ_l g"
      },
      {
        "topic": "Surface tension and capillarity",
        "keywords": [
          "surface tension",
          "capillary",
          "angle of contact",
          "excess pressure",
          "drop",
          "soap bubble",
          "meniscus"
        ],
        "formula": "h = 2S cos θ/rρg · ΔP = 2S/R (drop), 4S/R (bubble)"
      },
      {
        "topic": "Viscosity and terminal velocity",
        "keywords": [
          "viscosity",
          "terminal velocity",
          "stokes",
          "reynolds"
        ],
        "formula": "F = 6πηrv · v_t = 2r²(ρ−σ)g/9η · R_e = ρvD/η"
      },
      {
        "topic": "Bernoulli and continuity",
        "keywords": [
          "bernoulli",
          "equation of continuity",
          "streamline",
          "venturi",
          "efflux",
          "ideal fluid flows"
        ],
        "formula": "A₁v₁ = A₂v₂ · P + ½ρv² + ρgh = constant"
      }
    ],
    "Thermodynamics": [
      {
        "topic": "First law and internal energy",
        "keywords": [
          "first law of thermodynamics",
          "internal energy",
          "heat absorbed",
          "work done by the gas"
        ],
        "formula": "ΔQ = ΔU + ΔW"
      },
      {
        "topic": "Thermodynamic processes",
        "keywords": [
          "isothermal",
          "adiabatic",
          "isobaric",
          "isochoric",
          "p-v diagram",
          "cyclic process",
          "free expansion"
        ],
        "formula": "isothermal W = nRT ln(V₂/V₁) · adiabatic PVᵞ = const"
      },
      {
        "topic": "Heat engines, Carnot and refrigerators",
        "keywords": [
          "carnot",
          "heat engine",
          "refrigerator",
          "efficiency of the engine",
          "coefficient of performance",
          "second law"
        ],
        "formula": "η = 1 − T₂/T₁ · COP = T₂/(T₁−T₂)"
      },
      {
        "topic": "Molar specific heats",
        "keywords": [
          "molar specific heat",
          "ratio of molar specific heats",
          "degrees of freedom",
          "gamma"
        ],
        "formula": "C_P − C_V = R · γ = C_P/C_V · monatomic 5/3, diatomic 7/5"
      }
    ],
    "Oscillations": [
      {
        "topic": "SHM: displacement, velocity, acceleration",
        "keywords": [
          "simple harmonic motion",
          "shm",
          "mean position",
          "extreme position",
          "amplitude",
          "phase",
          "displacement of a particle executing"
        ],
        "formula": "x = A sin(ωt+φ) · v = ω√(A²−x²) · a = −ω²x"
      },
      {
        "topic": "Simple pendulum",
        "keywords": [
          "simple pendulum",
          "length of the pendulum",
          "seconds pendulum",
          "bob",
          "oscillations in",
          "pendulums"
        ],
        "formula": "T = 2π√(l/g)"
      },
      {
        "topic": "Spring-mass system",
        "keywords": [
          "spring mass",
          "force constant",
          "spring constant",
          "springs in series",
          "springs in parallel"
        ],
        "formula": "T = 2π√(m/k)"
      },
      {
        "topic": "Energy in SHM",
        "keywords": [
          "energy of the oscillator",
          "kinetic energy in shm",
          "potential energy in shm"
        ],
        "formula": "E = ½mω²A²"
      },
      {
        "topic": "Damped and forced oscillations",
        "keywords": [
          "damped",
          "forced oscillation",
          "resonance of spring",
          "quality factor"
        ],
        "formula": "amplitude decays as e^(−bt/2m)"
      }
    ],
    "Mechanical Properties of Solids": [
      {
        "topic": "Stress, strain and Young's modulus",
        "keywords": [
          "young's modulus",
          "longitudinal strain",
          "stress",
          "strain",
          "elongation",
          "extension",
          "wire stretched",
          "load is applied"
        ],
        "formula": "Y = stress/strain = FL/AΔL · ΔL ∝ 1/r²"
      },
      {
        "topic": "Bulk and rigidity modulus",
        "keywords": [
          "bulk modulus",
          "modulus of rigidity",
          "shear modulus",
          "compressibility",
          "poisson's ratio"
        ],
        "formula": "K = −P/(ΔV/V) · η = shear stress/shear strain · σ = lateral/longitudinal strain"
      },
      {
        "topic": "Elastic energy and limits",
        "keywords": [
          "elastic potential energy",
          "elastic limit",
          "breaking stress",
          "hooke",
          "stress strain curve"
        ],
        "formula": "U = ½ × stress × strain × volume = ½FΔL"
      }
    ],
    "Motion in a Plane": [
      {
        "topic": "Projectile motion",
        "keywords": [
          "projectile",
          "angle of projection",
          "maximum height",
          "horizontal range",
          "time of flight",
          "trajectory"
        ],
        "formula": "R = u²sin2θ/g · H = u²sin²θ/2g · T = 2u sinθ/g"
      },
      {
        "topic": "Vectors: addition, resolution, products",
        "keywords": [
          "resultant of two vectors",
          "unit vector",
          "scalar product",
          "vector product",
          "dot product",
          "cross product",
          "component of a vector",
          "components of a vector"
        ],
        "formula": "R = √(A²+B²+2AB cosθ) · A·B = AB cosθ · |A×B| = AB sinθ"
      },
      {
        "topic": "Circular motion",
        "keywords": [
          "circular motion",
          "centripetal acceleration",
          "uniform circular motion",
          "angular displacement"
        ],
        "formula": "a_c = v²/r = ω²r"
      },
      {
        "topic": "Relative velocity in a plane",
        "keywords": [
          "relative velocity of rain",
          "river",
          "boat",
          "swimmer"
        ],
        "formula": "v_AB = v_A − v_B"
      }
    ],
    "Laws of Motion": [
      {
        "topic": "Newton's laws and momentum",
        "keywords": [
          "newton's second law",
          "newton's third law",
          "rate of change of momentum",
          "conservation of momentum",
          "inertia",
          "action and reaction"
        ],
        "formula": "F = ma = dp/dt"
      },
      {
        "topic": "Friction",
        "keywords": [
          "coefficient of friction",
          "static friction",
          "kinetic friction",
          "angle of repose",
          "limiting friction",
          "rough surface",
          "remain stationary"
        ],
        "formula": "f_s ≤ μ_sN · f_k = μ_kN · tan θ_repose = μ_s"
      },
      {
        "topic": "Impulse",
        "keywords": [
          "impulse"
        ],
        "formula": "J = FΔt = Δp"
      },
      {
        "topic": "Connected bodies, pulleys and lifts",
        "keywords": [
          "pulley",
          "tension",
          "lift",
          "apparent weight",
          "connected bodies",
          "free body"
        ],
        "formula": "lift: N = m(g ± a) · pulley a = (m₁−m₂)g/(m₁+m₂)"
      },
      {
        "topic": "Banking and circular dynamics",
        "keywords": [
          "banking of road",
          "banked",
          "centripetal force"
        ],
        "formula": "tan θ = v²/rg"
      }
    ],
    "Electromagnetic Induction": [
      {
        "topic": "Faraday and Lenz laws",
        "keywords": [
          "faraday's law",
          "lenz's law",
          "induced emf",
          "rate of change of flux",
          "magnetic flux linked",
          "flux"
        ],
        "formula": "ε = −dΦ/dt · Φ = NBA cos θ"
      },
      {
        "topic": "Motional emf",
        "keywords": [
          "motional emf",
          "rod moving",
          "spoke",
          "rotated in a plane",
          "wheel"
        ],
        "formula": "ε = Bvl · rotating rod ε = ½Bωl²"
      },
      {
        "topic": "Self and mutual inductance",
        "keywords": [
          "self inductance",
          "mutual inductance",
          "henry",
          "inductor",
          "energy stored"
        ],
        "formula": "ε = −L dI/dt · U = ½LI² · L = μ₀n²Al"
      },
      {
        "topic": "Eddy currents and generators",
        "keywords": [
          "eddy current",
          "ac generator",
          "dynamo",
          "back emf"
        ],
        "formula": "ε = NBAω sin ωt"
      }
    ],
    "Dual Nature of Radiation and Matter": [
      {
        "topic": "Photoelectric effect",
        "keywords": [
          "photoelectric effect",
          "work function",
          "stopping potential",
          "threshold frequency",
          "threshold wavelength",
          "photoelectron",
          "einstein's photoelectric",
          "photocell"
        ],
        "formula": "K_max = hν − φ = hc(1/λ − 1/λ₀) · eV₀ = K_max"
      },
      {
        "topic": "de Broglie waves",
        "keywords": [
          "de broglie",
          "matter wave",
          "wavelength of an electron",
          "accelerated through",
          "davisson",
          "germer"
        ],
        "formula": "λ = h/p = h/√(2mK) · λ = 12·27/√V Å"
      },
      {
        "topic": "Photon energy and momentum",
        "keywords": [
          "photon energy",
          "photon",
          "number of photons",
          "radiation pressure"
        ],
        "formula": "E = hν = hc/λ · p = h/λ"
      }
    ],
    "Units and Measurements": [
      {
        "topic": "Dimensional analysis",
        "keywords": [
          "dimensional formula",
          "dimensions of",
          "dimensional analysis",
          "dimensionally correct",
          "physical quantity"
        ],
        "formula": "check: both sides must have the same M^a L^b T^c"
      },
      {
        "topic": "Errors and their propagation",
        "keywords": [
          "percentage error",
          "relative error",
          "absolute error",
          "error in measurement",
          "combination of errors"
        ],
        "formula": "for Q = xᵃyᵇ/zᶜ, ΔQ/Q = a(Δx/x)+b(Δy/y)+c(Δz/z)"
      },
      {
        "topic": "Significant figures and instruments",
        "keywords": [
          "significant figures",
          "least count",
          "vernier",
          "screw gauge",
          "accuracy",
          "precision"
        ],
        "formula": "least count = smallest division / number of divisions"
      }
    ],
    "Gravitation": [
      {
        "topic": "Newton's law and g",
        "keywords": [
          "universal gravitational constant",
          "acceleration due to gravity",
          "variation of g",
          "gravitational force between",
          "mass of the earth"
        ],
        "formula": "F = Gm₁m₂/r² · g = GM/R² · g_h = g(1−2h/R) · g_d = g(1−d/R)"
      },
      {
        "topic": "Orbital and escape velocity",
        "keywords": [
          "orbital velocity",
          "escape velocity",
          "satellite",
          "geostationary",
          "time period of satellite"
        ],
        "formula": "v_o = √(GM/r) · v_e = √(2GM/R) = 11·2 km s⁻¹"
      },
      {
        "topic": "Kepler's laws",
        "keywords": [
          "kepler",
          "orbital radius",
          "planet"
        ],
        "formula": "T² ∝ r³"
      },
      {
        "topic": "Gravitational potential and energy",
        "keywords": [
          "gravitational potential",
          "gravitational potential energy",
          "binding energy of satellite"
        ],
        "formula": "V = −GM/r · U = −GMm/r · BE = GMm/2r"
      }
    ],
    "Electromagnetic Waves": [
      {
        "topic": "The electromagnetic spectrum",
        "keywords": [
          "electromagnetic spectrum",
          "microwave",
          "infrared",
          "ultraviolet",
          "gamma rays",
          "x-rays",
          "radio waves",
          "sterilise",
          "ozone"
        ],
        "formula": "radio < microwave < IR < visible < UV < X-ray < γ"
      },
      {
        "topic": "Properties of EM waves",
        "keywords": [
          "displacement current",
          "poynting",
          "speed of light in vacuum",
          "maxwell",
          "transverse nature"
        ],
        "formula": "c = 1/√(μ₀ε₀) · E/B = c · E ⊥ B ⊥ direction"
      }
    ],
    "Communication Systems": [
      {
        "topic": "Modulation",
        "keywords": [
          "amplitude modulation",
          "frequency modulation",
          "modulation index",
          "carrier",
          "message signal",
          "super imposing",
          "sideband"
        ],
        "formula": "μ = A_m/A_c · sidebands at f_c ± f_m"
      },
      {
        "topic": "Propagation and the communication chain",
        "keywords": [
          "sky wave",
          "ground wave",
          "space wave",
          "ionosphere",
          "line of sight",
          "communication system",
          "transmitter",
          "receiver",
          "channel"
        ],
        "formula": "source → transmitter → channel → receiver → user · d = √(2Rh)"
      }
    ],
    "Kinetic Theory": [
      {
        "topic": "Kinetic theory and molecular speeds",
        "keywords": [
          "rms speed",
          "root mean square",
          "most probable speed",
          "mean free path",
          "kinetic theory",
          "molecular speed"
        ],
        "formula": "PV = ⅓Nmv̄² · v_rms = √(3RT/M) · λ = 1/(√2 nπd²)"
      },
      {
        "topic": "Equipartition and degrees of freedom",
        "keywords": [
          "equipartition",
          "degrees of freedom",
          "mean energy of a molecule"
        ],
        "formula": "½kT per degree of freedom · monatomic 3/2 kT"
      }
    ]
  },
  "Chemistry": {
    "Equilibrium": [
      {
        "topic": "Equilibrium constant and Le Chatelier",
        "keywords": [
          "equilibrium constant",
          "le chatelier",
          "reaction quotient",
          "kc",
          "kp",
          "direction of the reaction",
          "shift"
        ],
        "formula": "K_p = K_c(RT)^Δn · Q < K forward, Q > K backward"
      },
      {
        "topic": "Ionic equilibrium and pH",
        "keywords": [
          "ph of the solution",
          "ph",
          "ionic product",
          "degree of dissociation",
          "acid dissociation",
          "weak acid",
          "strong acid"
        ],
        "formula": "pH = −log[H⁺] · K_w = 10⁻¹⁴ · [H⁺] = √(K_a·C)"
      },
      {
        "topic": "Buffers",
        "keywords": [
          "buffer",
          "henderson",
          "conjugate acid",
          "conjugate base"
        ],
        "formula": "pH = pK_a + log([salt]/[acid])"
      },
      {
        "topic": "Solubility product",
        "keywords": [
          "solubility product",
          "ksp",
          "common ion effect",
          "precipitate"
        ],
        "formula": "K_sp = [Aⁿ⁺]ˣ[Bᵐ⁻]ʸ · AB: S = √K_sp"
      }
    ],
    "Alcohols, Phenols and Ethers": [
      {
        "topic": "Preparation of alcohols and phenols",
        "keywords": [
          "preparation",
          "hydration",
          "hydroboration",
          "grignard",
          "cumene",
          "reduction of"
        ],
        "formula": "hydroboration gives anti-Markovnikov; cumene gives phenol + acetone"
      },
      {
        "topic": "Reactions of alcohols",
        "keywords": [
          "dehydration",
          "oxidation of alcohol",
          "esterification",
          "lucas test",
          "victor meyer"
        ],
        "formula": "Lucas: 3° immediate, 2° in 5 min, 1° on heating"
      },
      {
        "topic": "Phenol reactions",
        "keywords": [
          "kolbe",
          "reimer tiemann",
          "phenol",
          "acidity of phenol",
          "bromination"
        ],
        "formula": "Reimer-Tiemann gives salicylaldehyde; Kolbe gives salicylic acid"
      },
      {
        "topic": "Ethers",
        "keywords": [
          "williamson",
          "ether",
          "cleavage of ether"
        ],
        "formula": "Williamson: R–X + R′O⁻Na⁺ → R–O–R′"
      }
    ],
    "Chemical Bonding and Molecular Structure": [
      {
        "topic": "Hybridisation and shape (VSEPR)",
        "keywords": [
          "hybridisation",
          "hybridization",
          "vsepr",
          "shape of",
          "geometry of",
          "bond angle",
          "lone pair"
        ],
        "formula": "sp linear, sp² trigonal planar, sp³ tetrahedral, sp³d trigonal bipyramidal"
      },
      {
        "topic": "Molecular orbital theory",
        "keywords": [
          "molecular orbital",
          "bond order",
          "paramagnetic",
          "diamagnetic",
          "mot"
        ],
        "formula": "bond order = (N_b − N_a)/2"
      },
      {
        "topic": "Polarity and dipole moment",
        "keywords": [
          "dipole moment",
          "polarity",
          "electronegativity difference",
          "percentage ionic"
        ],
        "formula": "μ = q × d, measured in debye"
      },
      {
        "topic": "Resonance and formal charge",
        "keywords": [
          "resonance",
          "formal charge",
          "canonical"
        ],
        "formula": "formal charge = V − N − B/2"
      },
      {
        "topic": "Hydrogen bonding and intermolecular forces",
        "keywords": [
          "hydrogen bonding",
          "van der waals",
          "intermolecular force",
          "boiling point"
        ],
        "formula": "H-bonding needs H bound to N, O or F"
      }
    ],
    "Chemical Kinetics": [
      {
        "topic": "Rate law and order",
        "keywords": [
          "rate law",
          "order of reaction",
          "molecularity",
          "rate constant",
          "rate of reaction",
          "zero order"
        ],
        "formula": "rate = k[A]ᵐ[B]ⁿ · order = m+n"
      },
      {
        "topic": "First order kinetics and half-life",
        "keywords": [
          "first order",
          "half life of the reaction",
          "pseudo first order",
          "integrated rate"
        ],
        "formula": "k = (2·303/t)log(a/(a−x)) · t½ = 0·693/k"
      },
      {
        "topic": "Arrhenius equation and activation energy",
        "keywords": [
          "arrhenius",
          "activation energy",
          "temperature coefficient",
          "collision theory",
          "threshold energy"
        ],
        "formula": "k = Ae^(−Ea/RT) · log(k₂/k₁) = Ea/2·303R·(1/T₁−1/T₂)"
      },
      {
        "topic": "Catalysis and reaction profiles",
        "keywords": [
          "catalyst",
          "energy profile",
          "intermediate"
        ],
        "formula": "a catalyst lowers E_a and does not change ΔH"
      }
    ],
    "Biomolecules": [
      {
        "topic": "Carbohydrates",
        "keywords": [
          "carbohydrate",
          "monosaccharide",
          "disaccharide",
          "glucose",
          "fructose",
          "sucrose",
          "starch",
          "cellulose",
          "glycosidic",
          "reducing sugar",
          "anomer"
        ],
        "formula": "glucose C₆H₁₂O₆ · sucrose is non-reducing"
      },
      {
        "topic": "Proteins and amino acids",
        "keywords": [
          "amino acid",
          "peptide bond",
          "zwitterion",
          "protein",
          "denaturation",
          "primary structure",
          "secondary structure",
          "isoelectric"
        ],
        "formula": "amino acids are zwitterionic at the isoelectric point"
      },
      {
        "topic": "Nucleic acids",
        "keywords": [
          "nucleic acid",
          "nucleotide",
          "nucleoside",
          "dna",
          "rna",
          "base pairing"
        ],
        "formula": "nucleoside = base + sugar · nucleotide = base + sugar + phosphate"
      },
      {
        "topic": "Vitamins, enzymes and hormones",
        "keywords": [
          "vitamin",
          "enzyme",
          "hormone",
          "deficiency"
        ],
        "formula": "enzymes are biological catalysts, highly specific"
      }
    ],
    "Aldehydes, Ketones and Carboxylic Acids": [
      {
        "topic": "Nucleophilic addition",
        "keywords": [
          "nucleophilic addition",
          "cyanohydrin",
          "bisulphite",
          "semicarbazone",
          "oxime",
          "hydrazone",
          "schiff"
        ],
        "formula": "addition at the carbonyl carbon; aldehydes > ketones"
      },
      {
        "topic": "Distinguishing tests",
        "keywords": [
          "tollens",
          "fehling",
          "silver mirror",
          "iodoform",
          "benedict",
          "distinguish",
          "2,4-dnp"
        ],
        "formula": "Tollens/Fehling: aldehyde only · iodoform: CH₃CO– group"
      },
      {
        "topic": "Aldol and Cannizzaro",
        "keywords": [
          "aldol",
          "cannizzaro",
          "condensation",
          "alpha hydrogen",
          "α-hydrogen"
        ],
        "formula": "aldol needs α-H · Cannizzaro needs none"
      },
      {
        "topic": "Carboxylic acids and derivatives",
        "keywords": [
          "carboxylic",
          "acidity of",
          "esterification",
          "decarboxylation",
          "hvz",
          "acid chloride",
          "anhydride"
        ],
        "formula": "acidity rises with electron-withdrawing groups"
      },
      {
        "topic": "Reduction of carbonyl compounds",
        "keywords": [
          "clemmensen",
          "wolff kishner",
          "reduction",
          "lialh4",
          "nabh4"
        ],
        "formula": "Clemmensen: Zn-Hg/HCl · Wolff-Kishner: N₂H₄/KOH — both give –CH₂–"
      }
    ],
    "Some Basic Concepts of Chemistry": [
      {
        "topic": "Mole concept and stoichiometry",
        "keywords": [
          "mole concept",
          "number of moles",
          "molar mass",
          "avogadro",
          "stoichiometry",
          "limiting reagent",
          "mass of"
        ],
        "formula": "n = m/M = N/N_A · N_A = 6·022×10²³"
      },
      {
        "topic": "Empirical and molecular formula",
        "keywords": [
          "empirical formula",
          "molecular formula",
          "percentage composition"
        ],
        "formula": "molecular formula = n × empirical formula"
      },
      {
        "topic": "Concentration terms",
        "keywords": [
          "molarity",
          "molality",
          "normality",
          "mole fraction",
          "ppm"
        ],
        "formula": "M = n/V(L) · m = n/kg solvent"
      }
    ],
    "Haloalkanes and Haloarenes": [
      {
        "topic": "SN1 and SN2 mechanisms",
        "keywords": [
          "sn1",
          "sn2",
          "nucleophilic substitution",
          "racemisation",
          "inversion",
          "reactivity order"
        ],
        "formula": "SN2: 1° > 2° > 3°, inversion · SN1: 3° > 2° > 1°, racemisation"
      },
      {
        "topic": "Elimination reactions",
        "keywords": [
          "elimination",
          "saytzeff",
          "dehydrohalogenation",
          "zaitsev"
        ],
        "formula": "Saytzeff: the more substituted alkene predominates"
      },
      {
        "topic": "Preparation of haloalkanes",
        "keywords": [
          "finkelstein",
          "swarts",
          "markovnikov",
          "free radical halogenation"
        ],
        "formula": "Finkelstein: R–Cl + NaI → R–I · Swarts gives R–F"
      },
      {
        "topic": "Organometallics and coupling",
        "keywords": [
          "grignard",
          "wurtz",
          "fittig",
          "sandmeyer"
        ],
        "formula": "Grignard RMgX; Wurtz 2R–X + 2Na → R–R"
      }
    ],
    "Coordination Compounds": [
      {
        "topic": "Nomenclature and Werner's theory",
        "keywords": [
          "iupac name",
          "werner",
          "coordination number",
          "primary valency",
          "secondary valency",
          "ligand"
        ],
        "formula": "name ligands alphabetically, then the metal with its oxidation state"
      },
      {
        "topic": "Isomerism in complexes",
        "keywords": [
          "geometrical isomerism",
          "optical isomerism",
          "linkage isomerism",
          "ionisation isomerism",
          "isomer"
        ],
        "formula": "cis/trans for MA₂B₂; optical for unsymmetrical octahedral"
      },
      {
        "topic": "Crystal field theory and magnetism",
        "keywords": [
          "crystal field",
          "cfse",
          "spectrochemical",
          "high spin",
          "low spin",
          "magnetic moment",
          "unpaired electron",
          "splitting"
        ],
        "formula": "μ = √(n(n+2)) BM · Δ_o governs high vs low spin"
      },
      {
        "topic": "Bonding and hybridisation in complexes",
        "keywords": [
          "valence bond",
          "inner orbital",
          "outer orbital",
          "d2sp3",
          "sp3d2"
        ],
        "formula": "d²sp³ inner orbital; sp³d² outer orbital"
      }
    ],
    "p-Block Elements (Group 15-18)": [
      {
        "topic": "Group trends and anomalous behaviour",
        "keywords": [
          "inert pair effect",
          "catenation",
          "anomalous",
          "group 15",
          "group 16",
          "group 17",
          "group 18",
          "down the group"
        ],
        "formula": "inert pair effect makes the lower oxidation state more stable down a group"
      },
      {
        "topic": "Oxoacids and oxides",
        "keywords": [
          "oxoacid",
          "oxide",
          "acidic strength",
          "phosphoric",
          "sulphuric"
        ],
        "formula": "acidic strength rises with oxidation state of the central atom"
      },
      {
        "topic": "Halogens and interhalogens",
        "keywords": [
          "halogen",
          "interhalogen",
          "bleaching",
          "oxidising power"
        ],
        "formula": "F₂ > Cl₂ > Br₂ > I₂ as oxidising agents"
      },
      {
        "topic": "Noble gases",
        "keywords": [
          "noble gas",
          "xenon",
          "xef"
        ],
        "formula": "XeF₂ linear, XeF₄ square planar, XeF₆ distorted octahedral"
      }
    ],
    "Surface Chemistry": [
      {
        "topic": "Adsorption",
        "keywords": [
          "adsorption",
          "physisorption",
          "chemisorption",
          "freundlich",
          "langmuir"
        ],
        "formula": "x/m = kP^(1/n) (Freundlich)"
      },
      {
        "topic": "Colloids and their properties",
        "keywords": [
          "colloid",
          "tyndall",
          "brownian",
          "sol",
          "emulsion",
          "micelle",
          "lyophilic",
          "lyophobic",
          "dialysis"
        ],
        "formula": "Tyndall effect distinguishes a colloid from a true solution"
      },
      {
        "topic": "Coagulation and protection",
        "keywords": [
          "coagulation",
          "hardy schulze",
          "peptisation",
          "gold number",
          "flocculation"
        ],
        "formula": "Hardy-Schulze: coagulating power rises steeply with ionic charge"
      },
      {
        "topic": "Catalysis",
        "keywords": [
          "catalysis",
          "homogeneous",
          "heterogeneous",
          "promoter",
          "zeolite",
          "enzyme catalysis"
        ],
        "formula": "shape-selective catalysis depends on pore size"
      }
    ],
    "Solutions": [
      {
        "topic": "Raoult's law and vapour pressure",
        "keywords": [
          "raoult",
          "vapour pressure",
          "ideal solution",
          "azeotrope",
          "positive deviation",
          "negative deviation"
        ],
        "formula": "P = P°_A x_A + P°_B x_B"
      },
      {
        "topic": "Colligative properties",
        "keywords": [
          "colligative",
          "osmotic pressure",
          "depression in freezing",
          "elevation in boiling",
          "relative lowering"
        ],
        "formula": "ΔT_b = K_b·m · ΔT_f = K_f·m · π = CRT"
      },
      {
        "topic": "Van't Hoff factor",
        "keywords": [
          "van't hoff",
          "association",
          "dissociation",
          "abnormal molar mass"
        ],
        "formula": "i = observed/calculated colligative property"
      },
      {
        "topic": "Henry's law and solubility of gases",
        "keywords": [
          "henry's law",
          "solubility of gas"
        ],
        "formula": "p = K_H·x"
      }
    ],
    "Electrochemistry": [
      {
        "topic": "Electrode potential and cell emf",
        "keywords": [
          "electrode potential",
          "galvanic cell",
          "cell potential",
          "emf of the cell",
          "salt bridge",
          "spontaneous"
        ],
        "formula": "E°_cell = E°_cathode − E°_anode · ΔG° = −nFE°"
      },
      {
        "topic": "Nernst equation",
        "keywords": [
          "nernst"
        ],
        "formula": "E = E° − (0·0591/n)log Q"
      },
      {
        "topic": "Conductance and Kohlrausch",
        "keywords": [
          "conductivity",
          "molar conductivity",
          "kohlrausch",
          "equivalent conductance",
          "cell constant"
        ],
        "formula": "Λ_m = κ×1000/C · Λ°_m = λ°₊ + λ°₋"
      },
      {
        "topic": "Electrolysis and Faraday's laws",
        "keywords": [
          "electrolysis",
          "faraday's law",
          "coulomb",
          "deposited",
          "quantity of electricity"
        ],
        "formula": "m = ZIt · 1 F = 96500 C"
      }
    ],
    "Solid State": [
      {
        "topic": "Unit cells and packing",
        "keywords": [
          "unit cell",
          "fcc",
          "bcc",
          "hcp",
          "simple cubic",
          "packing efficiency",
          "coordination number",
          "number of atoms per unit cell"
        ],
        "formula": "sc 1, bcc 2, fcc 4 atoms · fcc 74%, bcc 68%, sc 52%"
      },
      {
        "topic": "Density and edge length",
        "keywords": [
          "density of the crystal",
          "edge length",
          "atomic radius"
        ],
        "formula": "ρ = ZM/(a³N_A) · fcc r = a/2√2 · bcc r = √3a/4"
      },
      {
        "topic": "Defects",
        "keywords": [
          "schottky",
          "frenkel",
          "defect",
          "vacancy",
          "f-centre",
          "non-stoichiometric"
        ],
        "formula": "Schottky lowers density; Frenkel does not"
      },
      {
        "topic": "Voids and ionic structures",
        "keywords": [
          "void",
          "tetrahedral",
          "octahedral",
          "radius ratio"
        ],
        "formula": "radius ratio: 0·225–0·414 tetrahedral, 0·414–0·732 octahedral"
      }
    ],
    "Thermodynamics": [
      {
        "topic": "First law and enthalpy",
        "keywords": [
          "first law",
          "internal energy",
          "enthalpy",
          "exothermic",
          "endothermic",
          "work done"
        ],
        "formula": "ΔU = q + w · ΔH = ΔU + Δn_gRT"
      },
      {
        "topic": "Hess's law and enthalpy changes",
        "keywords": [
          "hess",
          "enthalpy of formation",
          "enthalpy of combustion",
          "bond enthalpy",
          "enthalpy of neutralisation"
        ],
        "formula": "ΔH_rxn = ΣΔH_f(products) − ΣΔH_f(reactants)"
      },
      {
        "topic": "Entropy and Gibbs energy",
        "keywords": [
          "entropy",
          "gibbs",
          "spontaneity",
          "free energy"
        ],
        "formula": "ΔG = ΔH − TΔS · spontaneous if ΔG < 0"
      }
    ],
    "d- and f-Block Elements": [
      {
        "topic": "Transition element trends",
        "keywords": [
          "transition element",
          "variable oxidation state",
          "interstitial",
          "alloy",
          "catalytic property",
          "colour of the ion"
        ],
        "formula": "colour and catalysis come from partly filled d orbitals"
      },
      {
        "topic": "Magnetic behaviour",
        "keywords": [
          "magnetic moment",
          "unpaired",
          "paramagnetic"
        ],
        "formula": "μ = √(n(n+2)) BM"
      },
      {
        "topic": "Lanthanoids and actinoids",
        "keywords": [
          "lanthanoid",
          "actinoid",
          "lanthanide contraction"
        ],
        "formula": "lanthanoid contraction: poor shielding by 4f electrons"
      },
      {
        "topic": "Important compounds",
        "keywords": [
          "potassium dichromate",
          "potassium permanganate",
          "k2cr2o7",
          "kmno4"
        ],
        "formula": "MnO₄⁻ + 8H⁺ + 5e⁻ → Mn²⁺ + 4H₂O"
      }
    ],
    "Redox Reactions": [
      {
        "topic": "Oxidation number",
        "keywords": [
          "oxidation number",
          "oxidation state"
        ],
        "formula": "sum of oxidation numbers = charge on the species"
      },
      {
        "topic": "Balancing redox equations",
        "keywords": [
          "balancing",
          "half reaction",
          "ion electron",
          "n-factor",
          "equivalent weight"
        ],
        "formula": "balance atoms, then charge with electrons"
      },
      {
        "topic": "Oxidising and reducing agents",
        "keywords": [
          "oxidising agent",
          "reducing agent",
          "disproportionation"
        ],
        "formula": "the oxidising agent is itself reduced"
      }
    ],
    "Hydrocarbons": [
      {
        "topic": "Alkanes",
        "keywords": [
          "alkane",
          "conformation",
          "newman",
          "free radical substitution"
        ],
        "formula": "staggered is more stable than eclipsed"
      },
      {
        "topic": "Alkenes and alkynes",
        "keywords": [
          "alkene",
          "alkyne",
          "markovnikov",
          "peroxide effect",
          "ozonolysis",
          "hydrogenation",
          "addition reaction"
        ],
        "formula": "Markovnikov: H adds to the carbon with more H"
      },
      {
        "topic": "Aromatic hydrocarbons",
        "keywords": [
          "benzene",
          "aromatic",
          "friedel",
          "electrophilic substitution",
          "huckel",
          "directive influence",
          "ortho",
          "para"
        ],
        "formula": "Hückel: planar, cyclic, (4n+2)π electrons"
      }
    ],
    "Structure of Atom": [
      {
        "topic": "Quantum numbers and orbitals",
        "keywords": [
          "quantum number",
          "orbital",
          "azimuthal",
          "magnetic quantum",
          "spin",
          "shape of orbital",
          "node"
        ],
        "formula": "n, l, m, s · orbitals in a shell = n² · electrons = 2n²"
      },
      {
        "topic": "Electronic configuration",
        "keywords": [
          "electronic configuration",
          "aufbau",
          "hund",
          "pauli",
          "exclusion"
        ],
        "formula": "fill in order of increasing (n+l)"
      },
      {
        "topic": "Bohr model and spectra",
        "keywords": [
          "bohr",
          "hydrogen spectrum",
          "balmer",
          "lyman",
          "rydberg",
          "energy of the electron"
        ],
        "formula": "E_n = −13·6/n² eV · 1/λ = R(1/n₁²−1/n₂²)"
      },
      {
        "topic": "Dual nature and uncertainty",
        "keywords": [
          "de broglie",
          "heisenberg",
          "uncertainty",
          "photoelectric"
        ],
        "formula": "λ = h/mv · Δx·Δp ≥ h/4π"
      }
    ],
    "Amines": [
      {
        "topic": "Preparation of amines",
        "keywords": [
          "gabriel",
          "hofmann bromamide",
          "reduction of nitro",
          "ammonolysis"
        ],
        "formula": "Gabriel gives only 1° aliphatic amines"
      },
      {
        "topic": "Basicity of amines",
        "keywords": [
          "basicity",
          "basic strength",
          "aniline",
          "pkb"
        ],
        "formula": "aliphatic: 2° > 1° > 3° in water · aromatic amines are weaker"
      },
      {
        "topic": "Distinguishing and diazonium",
        "keywords": [
          "carbylamine",
          "hinsberg",
          "diazonium",
          "sandmeyer",
          "coupling",
          "azo dye"
        ],
        "formula": "carbylamine test: 1° amine + CHCl₃ + KOH → foul isocyanide"
      }
    ],
    "Isolation of Elements (Metallurgy)": [
      {
        "topic": "Concentration of ores",
        "keywords": [
          "froth flotation",
          "magnetic separation",
          "leaching",
          "concentration of ore",
          "gravity separation"
        ],
        "formula": "froth flotation for sulphide ores"
      },
      {
        "topic": "Reduction and refining",
        "keywords": [
          "roasting",
          "calcination",
          "smelting",
          "van arkel",
          "mond",
          "zone refining",
          "electrolytic refining",
          "ellingham"
        ],
        "formula": "roasting for sulphides, calcination for carbonates"
      }
    ],
    "Organic Chemistry - Basic Principles": [
      {
        "topic": "Isomerism",
        "keywords": [
          "isomer",
          "chain isomerism",
          "position isomerism",
          "functional isomerism",
          "tautomer",
          "metamerism"
        ],
        "formula": "same molecular formula, different structure"
      },
      {
        "topic": "Electronic effects",
        "keywords": [
          "inductive effect",
          "resonance effect",
          "hyperconjugation",
          "electromeric",
          "mesomeric"
        ],
        "formula": "+I pushes electrons, −I pulls them"
      },
      {
        "topic": "Reaction intermediates",
        "keywords": [
          "carbocation",
          "carbanion",
          "free radical",
          "stability of"
        ],
        "formula": "carbocation stability 3° > 2° > 1°"
      },
      {
        "topic": "IUPAC nomenclature",
        "keywords": [
          "iupac",
          "nomenclature",
          "name of the compound"
        ],
        "formula": "longest chain, lowest locants, alphabetical substituents"
      }
    ],
    "Classification of Elements and Periodicity": [
      {
        "topic": "Periodic trends",
        "keywords": [
          "ionisation enthalpy",
          "electron gain enthalpy",
          "electronegativity",
          "atomic radius",
          "ionic radius",
          "periodic trend",
          "across a period"
        ],
        "formula": "across a period: size falls, IE rises · down a group: the reverse"
      },
      {
        "topic": "Periodic classification",
        "keywords": [
          "periodic table",
          "block",
          "mendeleev",
          "modern periodic law",
          "diagonal relationship"
        ],
        "formula": "properties are a periodic function of atomic number"
      }
    ],
    "Polymers": [
      {
        "topic": "Types of polymerisation",
        "keywords": [
          "addition polymerisation",
          "condensation polymerisation",
          "copolymer",
          "free radical polymerisation"
        ],
        "formula": "addition: no small molecule lost · condensation: water lost"
      },
      {
        "topic": "Important polymers",
        "keywords": [
          "nylon",
          "bakelite",
          "teflon",
          "buna",
          "terylene",
          "pvc",
          "polythene",
          "rubber"
        ],
        "formula": "nylon-6,6 from adipic acid + hexamethylenediamine"
      }
    ],
    "Hydrogen": [
      {
        "topic": "Hydrogen and its isotopes",
        "keywords": [
          "isotope of hydrogen",
          "deuterium",
          "tritium",
          "ortho",
          "para hydrogen"
        ],
        "formula": "protium, deuterium, tritium"
      },
      {
        "topic": "Water, hard water and hydrides",
        "keywords": [
          "hard water",
          "softening",
          "heavy water",
          "hydride",
          "hydrogen peroxide"
        ],
        "formula": "temporary hardness from bicarbonates; permanent from sulphates/chlorides"
      }
    ],
    "States of Matter": [
      {
        "topic": "Gas laws and the ideal gas equation",
        "keywords": [
          "boyle",
          "charles",
          "gay lussac",
          "ideal gas equation",
          "dalton",
          "partial pressure"
        ],
        "formula": "PV = nRT · P_total = Σp_i"
      },
      {
        "topic": "Kinetic theory and real gases",
        "keywords": [
          "kinetic theory",
          "van der waals",
          "compressibility factor",
          "critical temperature",
          "rms"
        ],
        "formula": "(P + an²/V²)(V − nb) = nRT · Z = PV/nRT"
      }
    ],
    "s-Block Elements": [
      {
        "topic": "Alkali and alkaline earth metals",
        "keywords": [
          "alkali metal",
          "alkaline earth",
          "group 1",
          "group 2",
          "sodium",
          "calcium",
          "diagonal relationship"
        ],
        "formula": "reactivity increases down the group"
      },
      {
        "topic": "Important s-block compounds",
        "keywords": [
          "washing soda",
          "baking soda",
          "plaster of paris",
          "quick lime",
          "caustic soda"
        ],
        "formula": "plaster of Paris: CaSO₄·½H₂O"
      }
    ],
    "Chemistry in Everyday Life": [
      {
        "topic": "Drugs and their action",
        "keywords": [
          "antibiotic",
          "analgesic",
          "antiseptic",
          "disinfectant",
          "antacid",
          "tranquilizer",
          "antihistamine",
          "drug"
        ],
        "formula": "antiseptics are applied to living tissue, disinfectants are not"
      },
      {
        "topic": "Food additives and detergents",
        "keywords": [
          "artificial sweetener",
          "preservative",
          "detergent",
          "soap",
          "edible colour"
        ],
        "formula": "anionic, cationic and non-ionic detergents"
      }
    ],
    "p-Block Elements (Group 13-14)": [
      {
        "topic": "Group 13 and 14 trends",
        "keywords": [
          "group 13",
          "group 14",
          "boron",
          "aluminium",
          "carbon",
          "silicon",
          "catenation",
          "inert pair"
        ],
        "formula": "catenation falls down group 14: C ≫ Si > Ge ≈ Sn"
      },
      {
        "topic": "Important compounds",
        "keywords": [
          "borax",
          "diborane",
          "silicone",
          "silicate",
          "zeolite",
          "alum"
        ],
        "formula": "diborane has three-centre two-electron banana bonds"
      }
    ],
    "Environmental Chemistry": [
      {
        "topic": "Pollution and its control",
        "keywords": [
          "pollution",
          "smog",
          "acid rain",
          "greenhouse",
          "ozone depletion",
          "bod",
          "pollutant"
        ],
        "formula": "classical smog is reducing; photochemical smog is oxidising"
      }
    ]
  },
  "Mathematics": {
    "Relations and Functions": [
      {
        "topic": "Types of relations",
        "keywords": [
          "equivalence relation",
          "reflexive",
          "symmetric",
          "transitive",
          "relation r",
          "relation on the set",
          "ordered pairs",
          "number of relations",
          "relation in the set"
        ],
        "formula": "equivalence = reflexive + symmetric + transitive"
      },
      {
        "topic": "Types of functions",
        "keywords": [
          "one one",
          "onto",
          "bijective",
          "injective",
          "surjective",
          "into",
          "the function f",
          "number of functions",
          "defined by f"
        ],
        "formula": "bijective = one-one + onto · n! bijections on a set of n elements"
      },
      {
        "topic": "Domain and range",
        "keywords": [
          "domain",
          "range of the function",
          "codomain"
        ],
        "formula": "domain: where the rule is defined"
      },
      {
        "topic": "Composition and inverse",
        "keywords": [
          "composite function",
          "fog",
          "gof",
          "inverse of the function"
        ],
        "formula": "(f∘g)(x) = f(g(x)) · f⁻¹ exists iff f is bijective"
      },
      {
        "topic": "Binary operations",
        "keywords": [
          "binary operation",
          "commutative",
          "associative",
          "identity element"
        ],
        "formula": "a*b defined on A×A → A"
      }
    ],
    "Conic Sections": [
      {
        "topic": "Circles",
        "keywords": [
          "equation of the circle",
          "centre and radius",
          "cut orthogonally",
          "orthogonally",
          "common chord",
          "radical",
          "tangent to the circle",
          "touch each other"
        ],
        "formula": "x²+y²+2gx+2fy+c = 0 · centre (−g,−f), r = √(g²+f²−c)"
      },
      {
        "topic": "Parabola",
        "keywords": [
          "parabola",
          "focus of the parabola",
          "directrix",
          "latus rectum of the parabola"
        ],
        "formula": "y² = 4ax · focus (a,0) · latus rectum 4a"
      },
      {
        "topic": "Ellipse",
        "keywords": [
          "ellipse",
          "major axis",
          "minor axis",
          "auxiliary circle"
        ],
        "formula": "x²/a² + y²/b² = 1 · e = √(1−b²/a²)"
      },
      {
        "topic": "Hyperbola",
        "keywords": [
          "hyperbola",
          "asymptote",
          "conjugate axis",
          "transverse axis"
        ],
        "formula": "x²/a² − y²/b² = 1 · e = √(1+b²/a²)"
      },
      {
        "topic": "Eccentricity and general conics",
        "keywords": [
          "eccentricity",
          "latus rectum",
          "conic"
        ],
        "formula": "circle 0, ellipse <1, parabola 1, hyperbola >1"
      }
    ],
    "Trigonometric Functions": [
      {
        "topic": "Identities and transformations",
        "keywords": [
          "identity",
          "transformation formula",
          "compound angle",
          "multiple angle",
          "trigonometric identity",
          "value of sin",
          "value of cos",
          "value of tan",
          "simplified form"
        ],
        "formula": "sin(A±B) = sinA cosB ± cosA sinB · sin²+cos² = 1"
      },
      {
        "topic": "Trigonometric equations",
        "keywords": [
          "general solution",
          "principal solution",
          "solutions of the equation"
        ],
        "formula": "sin θ = sin α ⟹ θ = nπ + (−1)ⁿα"
      },
      {
        "topic": "Properties of triangles",
        "keywords": [
          "sine rule",
          "cosine rule",
          "in any triangle",
          "circum radius",
          "in-radius",
          "area of the triangle",
          "angles of a triangle are in the ratio"
        ],
        "formula": "a/sinA = b/sinB = c/sinC = 2R · cosA = (b²+c²−a²)/2bc"
      },
      {
        "topic": "Heights and distances",
        "keywords": [
          "angle of elevation",
          "angle of depression",
          "tower",
          "aeroplane"
        ],
        "formula": "tan θ = opposite/adjacent"
      }
    ],
    "Application of Derivatives": [
      {
        "topic": "Maxima and minima",
        "keywords": [
          "maxima",
          "minima",
          "local maximum",
          "local minimum",
          "greatest value",
          "least value",
          "maximum area",
          "maximum volume"
        ],
        "formula": "f′(x) = 0 and f″(x) > 0 ⟹ minimum"
      },
      {
        "topic": "Tangents and normals",
        "keywords": [
          "tangent to the curve",
          "normal to the curve",
          "slope of the tangent"
        ],
        "formula": "slope = dy/dx at the point · normal slope = −1/(dy/dx)"
      },
      {
        "topic": "Increasing and decreasing functions",
        "keywords": [
          "increasing function",
          "decreasing function",
          "strictly increasing",
          "monotonic"
        ],
        "formula": "f′(x) > 0 increasing · f′(x) < 0 decreasing"
      },
      {
        "topic": "Rate of change",
        "keywords": [
          "rate of change",
          "rate at which",
          "per second"
        ],
        "formula": "dy/dt = (dy/dx)(dx/dt)"
      },
      {
        "topic": "Approximations and errors",
        "keywords": [
          "approximation",
          "approximate value",
          "errors"
        ],
        "formula": "Δy ≈ f′(x)Δx"
      }
    ],
    "Continuity and Differentiability": [
      {
        "topic": "Continuity",
        "keywords": [
          "continuous at",
          "continuity",
          "discontinuous",
          "left hand limit",
          "right hand limit"
        ],
        "formula": "lim(x→a⁻)f = lim(x→a⁺)f = f(a)"
      },
      {
        "topic": "Differentiability",
        "keywords": [
          "differentiable at",
          "not differentiable",
          "derivative exists"
        ],
        "formula": "LHD = RHD at the point"
      },
      {
        "topic": "Rules of differentiation",
        "keywords": [
          "chain rule",
          "product rule",
          "quotient rule",
          "logarithmic differentiation",
          "parametric",
          "implicit"
        ],
        "formula": "d(uv) = u dv + v du · chain: dy/dx = dy/du · du/dx"
      },
      {
        "topic": "Mean value theorems",
        "keywords": [
          "rolle",
          "lagrange",
          "mean value theorem"
        ],
        "formula": "Rolle: f(a)=f(b) ⟹ ∃c, f′(c)=0"
      },
      {
        "topic": "Second order derivatives",
        "keywords": [
          "second order derivative",
          "d2y/dx2"
        ],
        "formula": "d²y/dx² = d/dx(dy/dx)"
      }
    ],
    "Vector Algebra": [
      {
        "topic": "Dot product",
        "keywords": [
          "scalar product",
          "dot product",
          "projection",
          "angle between the vectors",
          "perpendicular vectors"
        ],
        "formula": "a·b = |a||b|cosθ · projection = a·b/|b|"
      },
      {
        "topic": "Cross product",
        "keywords": [
          "vector product",
          "cross product",
          "area of the parallelogram",
          "area of triangle"
        ],
        "formula": "|a×b| = |a||b|sinθ · area of triangle = ½|a×b|"
      },
      {
        "topic": "Scalar triple product",
        "keywords": [
          "scalar triple product",
          "coterminous edges",
          "parallelopiped",
          "coplanar",
          "volume of the tetrahedron"
        ],
        "formula": "[a b c] = a·(b×c) · coplanar ⟺ [a b c] = 0"
      },
      {
        "topic": "Unit vectors and direction cosines",
        "keywords": [
          "unit vector",
          "direction cosines",
          "direction ratios",
          "magnitude of the vector"
        ],
        "formula": "l²+m²+n² = 1 · â = a/|a|"
      }
    ],
    "Integrals": [
      {
        "topic": "Indefinite integration techniques",
        "keywords": [
          "integration by parts",
          "substitution",
          "partial fraction",
          "indefinite"
        ],
        "formula": "∫u dv = uv − ∫v du"
      },
      {
        "topic": "Definite integrals and properties",
        "keywords": [
          "definite integral",
          "properties of definite",
          "limits of integration"
        ],
        "formula": "∫ₐᵇf = ∫ₐᵇf(a+b−x) · ∫₋ₐᵃ odd = 0"
      },
      {
        "topic": "Standard integrals",
        "keywords": [
          "integral of",
          "standard integral",
          "is equal to"
        ],
        "formula": "∫dx/(x²+a²) = (1/a)tan⁻¹(x/a)"
      }
    ],
    "Matrices": [
      {
        "topic": "Types of matrices",
        "keywords": [
          "symmetric matrix",
          "skew symmetric",
          "idempotent",
          "nilpotent",
          "involutory",
          "orthogonal matrix",
          "diagonal matrix"
        ],
        "formula": "symmetric A′ = A · skew-symmetric A′ = −A"
      },
      {
        "topic": "Matrix operations",
        "keywords": [
          "transpose",
          "product of matrices",
          "order of the matrix",
          "multiplication of matrices"
        ],
        "formula": "(AB)′ = B′A′ · AB ≠ BA in general"
      },
      {
        "topic": "Inverse and elementary operations",
        "keywords": [
          "invertible",
          "inverse of the matrix",
          "elementary transformation",
          "singular"
        ],
        "formula": "A⁻¹ = adj(A)/|A|, exists iff |A| ≠ 0"
      }
    ],
    "Complex Numbers and Quadratic Equations": [
      {
        "topic": "Modulus and argument",
        "keywords": [
          "modulus",
          "argument",
          "amplitude of",
          "polar form",
          "complex conjugate"
        ],
        "formula": "|z| = √(x²+y²) · arg z = tan⁻¹(y/x)"
      },
      {
        "topic": "Powers, roots and De Moivre",
        "keywords": [
          "de moivre",
          "cube roots of unity",
          "nth root",
          "omega"
        ],
        "formula": "(cosθ+isinθ)ⁿ = cos nθ + i sin nθ · 1+ω+ω² = 0"
      },
      {
        "topic": "Quadratic equations and roots",
        "keywords": [
          "roots of the equation",
          "discriminant",
          "nature of the roots",
          "sum of the roots",
          "product of the roots"
        ],
        "formula": "α+β = −b/a · αβ = c/a · D = b²−4ac"
      }
    ],
    "Probability": [
      {
        "topic": "Conditional probability and Bayes",
        "keywords": [
          "conditional probability",
          "bayes",
          "total probability",
          "given that"
        ],
        "formula": "P(A|B) = P(A∩B)/P(B)"
      },
      {
        "topic": "Independent and mutually exclusive events",
        "keywords": [
          "independent",
          "mutually exclusive",
          "addition theorem"
        ],
        "formula": "independent: P(A∩B) = P(A)P(B) · P(A∪B) = P(A)+P(B)−P(A∩B)"
      },
      {
        "topic": "Random variables and distributions",
        "keywords": [
          "random variable",
          "probability distribution",
          "mean and variance",
          "expectation"
        ],
        "formula": "E(X) = Σxᵢpᵢ · Var = E(X²) − [E(X)]²"
      },
      {
        "topic": "Binomial distribution",
        "keywords": [
          "binomial distribution",
          "bernoulli",
          "trials"
        ],
        "formula": "P(X=r) = ⁿC_r pʳq^(n−r) · mean np, variance npq"
      }
    ],
    "Straight Lines": [
      {
        "topic": "Equation of a line",
        "keywords": [
          "equation of the straight line",
          "slope of the line",
          "intercept",
          "point slope",
          "two point form"
        ],
        "formula": "y − y₁ = m(x − x₁) · x/a + y/b = 1"
      },
      {
        "topic": "Angle between lines and distance",
        "keywords": [
          "angle between the lines",
          "perpendicular distance",
          "distance from the line",
          "parallel lines"
        ],
        "formula": "tanθ = |(m₁−m₂)/(1+m₁m₂)| · d = |ax₁+by₁+c|/√(a²+b²)"
      },
      {
        "topic": "Concurrency and intersection",
        "keywords": [
          "concurrent",
          "point of intersection",
          "family of lines"
        ],
        "formula": "three lines are concurrent iff the determinant of coefficients is 0"
      }
    ],
    "Determinants": [
      {
        "topic": "Evaluating determinants",
        "keywords": [
          "value of the determinant",
          "determinant",
          "properties of determinant"
        ],
        "formula": "expand along a row or column: Σaᵢⱼ·Cᵢⱼ"
      },
      {
        "topic": "Adjoint, inverse and Cramer",
        "keywords": [
          "adjoint",
          "cofactor",
          "minor",
          "cramer",
          "inverse of a matrix",
          "system of equations"
        ],
        "formula": "A⁻¹ = adj A/|A| · |adj A| = |A|ⁿ⁻¹"
      },
      {
        "topic": "Area of a triangle",
        "keywords": [
          "area of the triangle",
          "collinear points"
        ],
        "formula": "Δ = ½|x₁(y₂−y₃)+x₂(y₃−y₁)+x₃(y₁−y₂)|"
      }
    ],
    "Three Dimensional Geometry": [
      {
        "topic": "Lines in space",
        "keywords": [
          "equation of the line",
          "skew lines",
          "shortest distance",
          "angle between the lines"
        ],
        "formula": "(x−x₁)/a = (y−y₁)/b = (z−z₁)/c"
      },
      {
        "topic": "Planes",
        "keywords": [
          "equation of the plane",
          "normal to the plane",
          "angle between the planes",
          "distance of the point from the plane"
        ],
        "formula": "ax+by+cz+d = 0 · d = |ax₁+by₁+cz₁+d|/√(a²+b²+c²)"
      },
      {
        "topic": "Line and plane together",
        "keywords": [
          "foot of the perpendicular",
          "image of the point",
          "line and the plane",
          "coplanar lines"
        ],
        "formula": "line ⊥ plane ⟺ direction ratios ∥ normal"
      }
    ],
    "Mathematical Reasoning": [
      {
        "topic": "Statements and connectives",
        "keywords": [
          "statement",
          "compound statement",
          "conjunction",
          "disjunction",
          "quantifier"
        ],
        "formula": "p∧q true only when both are true"
      },
      {
        "topic": "Converse, inverse and contrapositive",
        "keywords": [
          "converse",
          "contrapositive",
          "inverse",
          "negation",
          "implication"
        ],
        "formula": "contrapositive of p→q is ~q→~p, and is equivalent"
      },
      {
        "topic": "Tautology and contradiction",
        "keywords": [
          "tautology",
          "contradiction",
          "truth table",
          "logically equivalent"
        ],
        "formula": "a tautology is true for every assignment"
      }
    ],
    "Differential Equations": [
      {
        "topic": "Order, degree and formation",
        "keywords": [
          "order and degree",
          "order of the differential",
          "degree of the differential",
          "formation of differential"
        ],
        "formula": "order = highest derivative · degree = its power when polynomial"
      },
      {
        "topic": "Variable separable and homogeneous",
        "keywords": [
          "variable separable",
          "homogeneous differential"
        ],
        "formula": "separable: ∫dy/g(y) = ∫f(x)dx"
      },
      {
        "topic": "Linear differential equations",
        "keywords": [
          "linear differential",
          "integrating factor"
        ],
        "formula": "dy/dx + Py = Q · IF = e^∫Pdx"
      }
    ],
    "Application of Integrals": [
      {
        "topic": "Area under curves",
        "keywords": [
          "area bounded",
          "area enclosed",
          "area of the region",
          "area under the curve"
        ],
        "formula": "A = ∫ₐᵇ y dx"
      }
    ],
    "Sets": [
      {
        "topic": "Operations on sets",
        "keywords": [
          "union",
          "intersection",
          "complement",
          "de morgan",
          "difference of sets"
        ],
        "formula": "n(A∪B) = n(A)+n(B)−n(A∩B)"
      },
      {
        "topic": "Subsets, power set and cardinality",
        "keywords": [
          "power set",
          "subset",
          "cardinality",
          "number of elements"
        ],
        "formula": "a set of n elements has 2ⁿ subsets"
      }
    ],
    "Inverse Trigonometric Functions": [
      {
        "topic": "Principal values",
        "keywords": [
          "principal value",
          "range of"
        ],
        "formula": "sin⁻¹ ∈ [−π/2, π/2] · cos⁻¹ ∈ [0, π]"
      },
      {
        "topic": "Identities and simplification",
        "keywords": [
          "sin-1",
          "cos-1",
          "tan-1",
          "identity",
          "simplify"
        ],
        "formula": "tan⁻¹x + tan⁻¹y = tan⁻¹((x+y)/(1−xy))"
      }
    ],
    "Sequences and Series": [
      {
        "topic": "Arithmetic progression",
        "keywords": [
          "arithmetic progression",
          "a.p",
          "common difference",
          "arithmetic mean"
        ],
        "formula": "aₙ = a+(n−1)d · Sₙ = n/2[2a+(n−1)d]"
      },
      {
        "topic": "Geometric progression",
        "keywords": [
          "geometric progression",
          "g.p",
          "common ratio",
          "geometric mean",
          "sum to infinity"
        ],
        "formula": "aₙ = arⁿ⁻¹ · Sₙ = a(1−rⁿ)/(1−r) · S∞ = a/(1−r)"
      },
      {
        "topic": "Special series",
        "keywords": [
          "sum to n terms",
          "sum of the squares",
          "sum of the cubes"
        ],
        "formula": "Σn = n(n+1)/2 · Σn² = n(n+1)(2n+1)/6"
      }
    ],
    "Linear Programming": [
      {
        "topic": "Formulation and graphical solution",
        "keywords": [
          "feasible region",
          "objective function",
          "corner point",
          "constraints",
          "maximise",
          "minimise"
        ],
        "formula": "the optimum lies at a corner of the feasible region"
      }
    ],
    "Statistics": [
      {
        "topic": "Measures of central tendency",
        "keywords": [
          "mean",
          "median",
          "mode"
        ],
        "formula": "mode = 3 median − 2 mean (approximately)"
      },
      {
        "topic": "Measures of dispersion",
        "keywords": [
          "standard deviation",
          "variance",
          "mean deviation",
          "coefficient of variation"
        ],
        "formula": "σ² = Σ(xᵢ−x̄)²/n · CV = σ/x̄ × 100"
      }
    ],
    "Permutations and Combinations": [
      {
        "topic": "Permutations",
        "keywords": [
          "permutation",
          "arrangements",
          "arranged",
          "npr",
          "circular"
        ],
        "formula": "ⁿP_r = n!/(n−r)! · circular (n−1)!"
      },
      {
        "topic": "Combinations",
        "keywords": [
          "combination",
          "selected",
          "ncr",
          "committee",
          "number of ways"
        ],
        "formula": "ⁿC_r = n!/(r!(n−r)!)"
      }
    ],
    "Limits and Derivatives": [
      {
        "topic": "Evaluation of limits",
        "keywords": [
          "limit",
          "lim",
          "tends to",
          "l hospital",
          "indeterminate"
        ],
        "formula": "lim(x→0) sinx/x = 1 · lim(x→0)(eˣ−1)/x = 1"
      },
      {
        "topic": "Derivative from first principles",
        "keywords": [
          "first principle",
          "derivative of"
        ],
        "formula": "f′(x) = lim(h→0)[f(x+h)−f(x)]/h"
      }
    ],
    "Binomial Theorem": [
      {
        "topic": "General and middle terms",
        "keywords": [
          "general term",
          "middle term",
          "term independent",
          "coefficient of x"
        ],
        "formula": "T_(r+1) = ⁿC_r a^(n−r)bʳ"
      }
    ],
    "Introduction to Three Dimensional Geometry": [
      {
        "topic": "Distance and section formula in 3D",
        "keywords": [
          "distance between the points",
          "section formula",
          "midpoint",
          "centroid",
          "octant"
        ],
        "formula": "d = √(Δx²+Δy²+Δz²)"
      }
    ],
    "Linear Inequalities": [
      {
        "topic": "Solving linear inequalities",
        "keywords": [
          "inequality",
          "inequalities",
          "solution set"
        ],
        "formula": "reversing the inequality when multiplying by a negative"
      }
    ]
  }
};
