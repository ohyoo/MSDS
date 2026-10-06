"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  BookOpen,
  BrainCircuit,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  Compass,
  Cpu,
  ExternalLink,
  Globe2,
  GraduationCap,
  HeartPulse,
  Layers,
  Lightbulb,
  Menu,
  MessageCircle,
  Network,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sigma,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import {
  capabilities,
  coreCourses,
  courses,
  pathways,
  program,
} from "@/lib/data";
import type { Course, Pathway } from "@/lib/schema";
import { recommendCourses } from "@/lib/recommendations";
import { analyzePlan } from "@/lib/plan";
import { answerGuide } from "@/lib/guide";
import { JourneyGraphic } from "@/components/JourneyGraphic";
import { Modal } from "@/components/Modal";

const interestOptions = [
  "Artificial Intelligence",
  "Generative AI",
  "Machine Learning",
  "Sports Analytics",
  "Business Analytics",
  "Health / Biostatistics",
  "Advanced Statistics",
  "Data Engineering",
  "Finance",
  "Causal Inference",
  "Time Series",
  "Geospatial Analytics",
  "Environmental Data",
  "Cybersecurity",
  "Optimization",
  "Deep Learning",
  "NLP / Text Analytics",
  "Computing / Systems",
];
const navigation = [
  { label: "Learning journey", href: "journey" },
  { label: "Core courses", href: "core" },
  { label: "Explore electives", href: "explore" },
  { label: "Pathways", href: "pathways" },
  { label: "Curriculum guide", href: "guide" },
];
const pathwayIcons = [
  BrainCircuit,
  Trophy,
  Building2,
  HeartPulse,
  Globe2,
  Sigma,
  Cpu,
];
const capabilityGroups = [
  {
    title: "Build your foundations",
    subtitle: "Ask better questions. Understand your data.",
    ids: ["problem-framing", "data-preparation", "computation", "statistics"],
  },
  {
    title: "Develop your methods",
    subtitle: "Find patterns. Reason with evidence.",
    ids: ["visualization", "inference", "machine-learning", "causal-reasoning"],
  },
  {
    title: "Create meaningful impact",
    subtitle: "Act responsibly. Make the work matter.",
    ids: ["ethics", "communication", "integration"],
  },
];
const capabilityIcons = [
  Compass,
  Layers,
  Cpu,
  Sigma,
  Search,
  Network,
  BrainCircuit,
  Lightbulb,
  ShieldCheck,
  MessageCircle,
  GraduationCap,
];

function readableTag(tag: string) {
  return tag
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function CreditLabel({ course }: { course: Course }) {
  return (
    <span className="credit-label">
      {course.credits === null
        ? "Credits to verify"
        : `${course.credits} ${course.credits === 1 ? "credit" : "credits"}`}
    </span>
  );
}

function StatusBadge({ course }: { course: Course }) {
  const statuses = {
    core: { text: "Required core", className: "badge-core" },
    capstone: { text: "Applied capstone", className: "badge-core" },
    recommended: { text: "MSDS Recommended", className: "badge-recommended" },
    specialty: {
      text: "MSDS Specialty Elective",
      className: "badge-specialty",
    },
    "catalog-only": {
      text: "Explore from UConn Catalog",
      className: "badge-catalog",
    },
  };
  const status = statuses[course.msdsStatus];
  return (
    <span className={`status-badge ${status.className}`}>
      <span className="badge-dot" />
      {status.text}
    </span>
  );
}

function SectionEyebrow({
  number,
  children,
}: {
  number: string;
  children: React.ReactNode;
}) {
  return (
    <p className="section-eyebrow">
      <span>{number}</span>
      <span className="eyebrow-rule" />
      {children}
    </p>
  );
}

type GuideMessage = {
  role: "student" | "guide";
  text: string;
  sources?: { label: string; url: string }[];
  suggestedCourses?: string[];
};

export default function Home() {
  const [activeNav, setActiveNav] = useState("journey");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [selectedCapability, setSelectedCapability] = useState<string | null>(
    null,
  );
  const [hoveredCourse, setHoveredCourse] = useState<string | null>(null);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [activePathway, setActivePathway] = useState<Pathway | null>(null);
  const [query, setQuery] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [showAllInterests, setShowAllInterests] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [guideInput, setGuideInput] = useState("");
  const [guideMessages, setGuideMessages] = useState<GuideMessage[]>([]);
  const [guideBusy, setGuideBusy] = useState(false);
  const [guideMode, setGuideMode] = useState<"deterministic" | "ai">(
    "deterministic",
  );
  const [visibleElectives, setVisibleElectives] = useState(9);

  const electivePool = useMemo(
    () => courses.filter((course) => course.kind === "elective"),
    [],
  );
  const signaturePathways = pathways.filter((pathway) => pathway.signature);
  const otherPathways = pathways.filter((pathway) => !pathway.signature);
  const curatedCount = electivePool.filter((course) => course.msdsStatus !== "catalog-only").length;
  const broaderCatalogCount = electivePool.length - curatedCount;
  const capstone = coreCourses.find((course) => course.kind === "capstone");
  const requiredCore = coreCourses.filter((course) => course.kind === "core");
  const selectedCourses = useMemo(
    () =>
      selectedCodes
        .map((code) => courses.find((course) => course.code === code))
        .filter((course): course is Course => !!course),
    [selectedCodes],
  );
  const planAnalysis = useMemo(
    () => analyzePlan(selectedCourses),
    [selectedCourses],
  );
  const recommendationResults = useMemo(() => {
    const results =
      query.trim() || interests.length
        ? recommendCourses(query, interests, electivePool)
        : electivePool.map((course) => ({
            course,
            score: 0,
            reasons: [] as string[],
            matchedTags: [] as string[],
          }));
    return results.filter(
      ({ course }) =>
        (statusFilter === "all" || course.msdsStatus === statusFilter) &&
        (departmentFilter === "all" || course.department === departmentFilter),
    );
  }, [query, interests, electivePool, statusFilter, departmentFilter]);
  const departments = [
    ...new Set(electivePool.map((course) => course.department)),
  ].sort();
  const highlightedCourse = coreCourses.find(
    (course) => course.code === hoveredCourse,
  );
  const connectedCourses = selectedCapability
    ? coreCourses.filter((course) =>
        course.capabilities.includes(selectedCapability),
      )
    : coreCourses;
  const capabilityDetail = capabilities.find(
    (capability) => capability.id === selectedCapability,
  );
  const closeCourse = useCallback(() => setActiveCourse(null), []);
  const closePathway = useCallback(() => setActivePathway(null), []);
  const closePlan = useCallback(() => setPlanOpen(false), []);

  useEffect(() => {
    const hydration = window.setTimeout(() => {
      try {
        const value: unknown = JSON.parse(
          localStorage.getItem("msds-elective-plan") ?? "[]",
        );
        if (Array.isArray(value))
          setSelectedCodes([
            ...new Set(
              value.filter(
                (code): code is string =>
                  typeof code === "string" &&
                  electivePool.some((course) => course.code === code),
              ),
            ),
          ]);
      } catch {
        /* A restricted browser can still use the explorer for this session. */
      }
      setStorageReady(true);
    }, 0);
    return () => window.clearTimeout(hydration);
  }, [electivePool]);

  useEffect(() => {
    if (!storageReady) return;
    try {
      localStorage.setItem("msds-elective-plan", JSON.stringify(selectedCodes));
    } catch {
      /* Persistence is optional. */
    }
  }, [selectedCodes, storageReady]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveNav(visible.target.id);
      },
      { rootMargin: "-100px 0px -55% 0px", threshold: [0, 0.1, 0.3] },
    );
    navigation.forEach(({ href }) => {
      const element = document.getElementById(href);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, []);

  function toggleInterest(interest: string) {
    setVisibleElectives(9);
    setInterests((previous) =>
      previous.includes(interest)
        ? previous.filter((item) => item !== interest)
        : [...previous, interest],
    );
  }

  function toggleCourse(course: Course) {
    setSelectedCodes((previous) =>
      previous.includes(course.code)
        ? previous.filter((code) => code !== course.code)
        : [...previous, course.code],
    );
  }

  function openCourse(course: Course) {
    setActivePathway(null);
    setPlanOpen(false);
    setActiveCourse(course);
  }

  async function askGuide(question: string) {
    if (!question.trim() || guideBusy) return;
    const trimmedQuestion = question.trim();
    let result = answerGuide(trimmedQuestion, selectedCourses);
    setGuideMessages((previous) => [
      ...previous,
      { role: "student", text: trimmedQuestion },
    ]);
    setGuideInput("");
    setGuideBusy(true);
    setGuideMode("deterministic");
    const endpoint = process.env.NEXT_PUBLIC_MSDS_GUIDE_ENDPOINT;
    if (endpoint) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: trimmedQuestion,
            selectedCodes: selectedCodes.slice(0, 12),
          }),
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) throw new Error("Guide unavailable");
        const envelope: unknown = await response.json();
        if (!envelope || typeof envelope !== "object")
          throw new Error("Invalid guide response");
        const data = envelope as Record<string, unknown>;
        if (
          typeof data.answer !== "string" ||
          !Array.isArray(data.sources) ||
          !Array.isArray(data.suggestedCourses)
        )
          throw new Error("Invalid guide response");
        const sources = data.sources.filter(
          (source): source is { label: string; url: string } => {
            if (
              !source ||
              typeof source !== "object" ||
              typeof source.label !== "string" ||
              typeof source.url !== "string"
            )
              return false;
            try {
              const url = new URL(source.url);
              return (
                url.protocol === "https:" &&
                (url.hostname === "uconn.edu" ||
                  url.hostname.endsWith(".uconn.edu"))
              );
            } catch {
              return false;
            }
          },
        );
        result = {
          answer: data.answer,
          sources,
          suggestedCourses: data.suggestedCourses.filter(
            (code): code is string =>
              typeof code === "string" &&
              courses.some((course) => course.code === code),
          ),
        };
        if (data.mode === "ai") setGuideMode("ai");
      } catch {
        /* The local guide stays available if the optional service fails. */
      }
    }
    setGuideMessages((previous) => [
      ...previous,
      {
        role: "guide",
        text: result.answer,
        sources: result.sources,
        suggestedCourses: result.suggestedCourses,
      },
    ]);
    setGuideBusy(false);
  }

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <div className="institution-bar">
        <div className="container institution-inner">
          <span>UNIVERSITY OF CONNECTICUT</span>
          <a
            href="https://masters.datascience.uconn.edu/"
            target="_blank"
            rel="noreferrer"
          >
            Visit the MSDS program <ArrowUpRight size={12} />
          </a>
        </div>
      </div>
      <header className="site-header">
        <div className="container header-inner">
          <a
            className="wordmark"
            href="#main-content"
            aria-label="UConn MSDS Curriculum Explorer home"
          >
            <span className="uconn-logo">UCONN</span>
            <span className="wordmark-divider" />
            <span className="program-wordmark">
              DATA SCIENCE<small>CURRICULUM EXPLORER</small>
            </span>
          </a>
          <nav className="desktop-nav" aria-label="Main navigation">
            {navigation.map(({ label, href }) => (
              <a
                key={href}
                href={`#${href}`}
                onClick={() => setActiveNav(href)}
                className={activeNav === href ? "nav-active" : ""}
              >
                {label}
              </a>
            ))}
          </nav>
          <button
            className="mobile-menu-button icon-button"
            aria-expanded={mobileMenu}
            aria-controls="mobile-navigation"
            aria-label={mobileMenu ? "Close navigation" : "Open navigation"}
            onClick={() => setMobileMenu(!mobileMenu)}
          >
            {mobileMenu ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {mobileMenu && (
          <nav
            id="mobile-navigation"
            className="mobile-nav"
            aria-label="Mobile navigation"
          >
            {navigation.map(({ label, href }) => (
              <a
                key={href}
                href={`#${href}`}
                onClick={() => {
                  setActiveNav(href);
                  setMobileMenu(false);
                }}
              >
                {label}
                <ArrowRight size={16} />
              </a>
            ))}
          </nav>
        )}
      </header>

      <main id="main-content">
        <section className="hero-section" aria-labelledby="hero-title">
          <div className="container hero-main">
            <div className="hero-copy">
              <p className="hero-eyebrow">
                <span />
                ONE PROGRAM. MANY POSSIBILITIES.
              </p>
              <h1 id="hero-title">
                Explore Your MSDS
                <br />
                <em>Learning Journey.</em>
              </h1>
              <p className="hero-description">
                Understand the core. Connect the possibilities.
                <br className="desktop-break" /> Build a path around the
                problems you want to solve.
              </p>
              <div className="hero-actions">
                <a href="#journey" className="button button-primary">
                  Discover the curriculum <ArrowRight size={17} />
                </a>
                <a href="#explore" className="text-link">
                  Find your pathway <ArrowUpRight size={17} />
                </a>
              </div>
              <p className="hero-footnote">
                <Network size={15} />
                Data science + AI + domain knowledge
              </p>
            </div>
            <JourneyGraphic />
          </div>
          <div className="container program-summary">
            <div className="summary-intro">
              <span className="small-label">YOUR DEGREE, AT A GLANCE</span>
              <p>One integrated learning experience.</p>
            </div>
            <div className="credit-stat stat-total">
              <strong>
                {program.credits.total}
                <span>credits</span>
              </strong>
              <span>MS in Data Science</span>
            </div>
            <span className="credit-equation" aria-hidden="true">
              =
            </span>
            <div className="credit-stat">
              <strong>{program.credits.core}</strong>
              <span>Required core</span>
            </div>
            <span className="credit-equation" aria-hidden="true">
              +
            </span>
            <div className="credit-stat">
              <strong>{program.credits.electives}</strong>
              <span>Two electives</span>
            </div>
            <span className="credit-equation" aria-hidden="true">
              +
            </span>
            <div className="credit-stat">
              <strong>{program.credits.capstone}</strong>
              <span>Applied capstone</span>
            </div>
          </div>
        </section>

        <section
          id="journey"
          className="journey-section section-space"
          aria-labelledby="journey-title"
        >
          <div className="container">
            <SectionEyebrow number="01">
              THE CONNECTED CURRICULUM
            </SectionEyebrow>
            <div className="section-heading">
              <h2 id="journey-title">
                Courses build capabilities.
                <br />
                <em>Capabilities come together in practice.</em>
              </h2>
              <p>
                From asking the right question to communicating the answer,
                explore the connections that make a data scientist.
              </p>
            </div>
            <div className="capability-map">
              <div className="map-topline">
                <span>
                  <Network size={16} />
                  Your learning, connected
                </span>
                <span>Choose a capability to explore its courses</span>
              </div>
              <div className="capability-groups">
                {capabilityGroups.map((group, groupIndex) => (
                  <div className="capability-group" key={group.title}>
                    <div className="group-heading">
                      <span className="group-number">0{groupIndex + 1}</span>
                      <h3>{group.title}</h3>
                      <p>{group.subtitle}</p>
                    </div>
                    <div className="capability-buttons">
                      {group.ids.map((id) => {
                        const capability = capabilities.find(
                          (item) => item.id === id,
                        );
                        if (!capability) return null;
                        const Icon =
                          capabilityIcons[
                            capabilities.findIndex((item) => item.id === id)
                          ] ?? Compass;
                        const active = selectedCapability === id;
                        const connected =
                          highlightedCourse?.capabilities.includes(id);
                        return (
                          <button
                            key={id}
                            className={`capability-button ${active ? "capability-active" : ""} ${connected ? "capability-connected" : ""}`}
                            aria-pressed={active}
                            onClick={() =>
                              setSelectedCapability(active ? null : id)
                            }
                          >
                            <Icon size={18} strokeWidth={1.6} />
                            <span>{capability.title}</span>
                            <ChevronRight size={14} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="map-connections" aria-live="polite">
                <div className="connection-description">
                  <span className="small-label">
                    {capabilityDetail
                      ? capabilityDetail.shortLabel.toUpperCase()
                      : "EXPLORE THE CONNECTIONS"}
                  </span>
                  <p>
                    {capabilityDetail
                      ? capabilityDetail.description
                      : "Select a capability above, or hover over a course to see where it contributes."}
                  </p>
                </div>
                <div className="connected-course-list">
                  {connectedCourses.map((course) => (
                    <button
                      className="connected-course"
                      key={course.code}
                      onClick={() => openCourse(course)}
                      onMouseEnter={() => setHoveredCourse(course.code)}
                      onMouseLeave={() => setHoveredCourse(null)}
                      onFocus={() => setHoveredCourse(course.code)}
                      onBlur={() => setHoveredCourse(null)}
                    >
                      {course.code}
                      <ArrowUpRight size={12} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <p className="interpretation-note">
              <Compass size={14} />A map of connected capabilities, not a
              prescribed course sequence. Connections are student-facing
              interpretations.
            </p>
          </div>
        </section>

        <section
          id="core"
          className="core-section section-space"
          aria-labelledby="core-title"
        >
          <div className="container">
            <SectionEyebrow number="02">YOUR SHARED FOUNDATION</SectionEyebrow>
            <div className="section-heading">
              <h2 id="core-title">
                Strong foundations.
                <br />
                <em>Lasting capability.</em>
              </h2>
              <div>
                <p>
                  Tools evolve. Statistical reasoning, computation, responsible
                  practice, and communication endure.
                </p>
                <span className="section-meta">
                  8 core courses <span>·</span> {program.credits.core} credits
                </span>
              </div>
            </div>
            <div className="core-grid">
              {requiredCore.map((course, index) => (
                <button
                  key={course.code}
                  className="core-card"
                  onClick={() => openCourse(course)}
                >
                  <div className="course-card-top">
                    <span className="course-code">{course.code}</span>
                    <CreditLabel course={course} />
                  </div>
                  <h3>{course.title}</h3>
                  <p>
                    {course.studentDescription ??
                      "Explore this course’s contribution to the connected MSDS curriculum."}
                  </p>
                  <div className="core-card-bottom">
                    <div className="course-tags">
                      {course.capabilities.slice(0, 2).map((id) => (
                        <span key={id}>
                          {capabilities.find(
                            (capability) => capability.id === id,
                          )?.shortLabel ?? readableTag(id)}
                        </span>
                      ))}
                    </div>
                    <span className="card-arrow">
                      <ArrowUpRight size={18} />
                    </span>
                  </div>
                  <span className="card-index" aria-hidden="true">
                    0{index + 1}
                  </span>
                </button>
              ))}
            </div>
            {capstone && (
              <button
                className="capstone-card"
                onClick={() => openCourse(capstone)}
              >
                <div className="capstone-icon">
                  <GraduationCap size={36} strokeWidth={1.25} />
                </div>
                <div className="capstone-copy">
                  <div className="capstone-eyebrow">
                    <span>{capstone.code}</span>
                    <span>THE PIECES COME TOGETHER</span>
                  </div>
                  <h3>{capstone.title}</h3>
                  <p>
                    {capstone.studentDescription ??
                      "Bring your skills together in a real-world applied data science project."}
                  </p>
                </div>
                <div className="capstone-end">
                  <span>{program.credits.capstone} credits</span>
                  <span className="capstone-cta">
                    Explore the capstone <ArrowUpRight size={19} />
                  </span>
                </div>
              </button>
            )}
          </div>
        </section>

        <section
          id="explore"
          className="explore-section section-space"
          aria-labelledby="explore-title"
        >
          <div className="container">
            <SectionEyebrow number="03">MAKE IT YOURS</SectionEyebrow>
            <div className="section-heading">
              <h2 id="explore-title">
                What are you
                <br />
                <em>interested in?</em>
              </h2>
              <p>
                Connect your interests to elective possibilities. Start broad,
                explore the matches, and shortlist the courses that speak to
                you.
              </p>
            </div>
            <div className="explorer-workspace">
              <form
                className="interest-search"
                onSubmit={(event) => event.preventDefault()}
              >
                <Search size={22} strokeWidth={1.7} />
                <label className="sr-only" htmlFor="interest-query">
                  Search electives by interests or career goals
                </label>
                <input
                  id="interest-query"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setVisibleElectives(9);
                  }}
                  placeholder="Try “sports analytics” or “generative AI and business”"
                />
                <button
                  className="search-submit"
                  type="submit"
                  aria-label="Search electives"
                >
                  <ArrowRight size={20} />
                </button>
              </form>
              <div className="interest-chip-header">
                <span className="small-label">OR FOLLOW YOUR CURIOSITY</span>
                <span>Choose more than one</span>
              </div>
              <div className="interest-chips">
                {interestOptions
                  .slice(0, showAllInterests ? undefined : 8)
                  .map((interest) => (
                    <button
                      key={interest}
                      className={`interest-chip ${interests.includes(interest) ? "interest-selected" : ""}`}
                      aria-pressed={interests.includes(interest)}
                      onClick={() => toggleInterest(interest)}
                    >
                      {interests.includes(interest) ? (
                        <Check size={13} />
                      ) : (
                        <Plus size={13} />
                      )}
                      {interest}
                    </button>
                  ))}
                <button
                  className="more-interests"
                  onClick={() => setShowAllInterests(!showAllInterests)}
                >
                  {showAllInterests ? "Fewer interests" : "More interests"}
                  <ChevronDown
                    size={14}
                    className={showAllInterests ? "rotate-180" : ""}
                  />
                </button>
              </div>
              <div className="explorer-filters">
                <div className="filter-controls">
                  <label>
                    <span className="sr-only">
                      Filter by recommendation type
                    </span>
                    <select
                      value={statusFilter}
                      onChange={(event) => {
                        setStatusFilter(event.target.value);
                        setVisibleElectives(9);
                      }}
                    >
                      <option value="all">All recommendation types</option>
                      <option value="recommended">MSDS Recommended</option>
                      <option value="specialty">MSDS Specialty Elective</option>
                      <option value="catalog-only">
                        Explore from UConn Catalog
                      </option>
                    </select>
                  </label>
                  <label>
                    <span className="sr-only">Filter by department</span>
                    <select
                      value={departmentFilter}
                      onChange={(event) => {
                        setDepartmentFilter(event.target.value);
                        setVisibleElectives(9);
                      }}
                    >
                      <option value="all">All departments</option>
                      {departments.map((department) => (
                        <option key={department} value={department}>
                          {department}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {(query ||
                  interests.length > 0 ||
                  statusFilter !== "all" ||
                  departmentFilter !== "all") && (
                  <button
                    className="clear-filters"
                    onClick={() => {
                      setQuery("");
                      setInterests([]);
                      setStatusFilter("all");
                      setDepartmentFilter("all");
                    }}
                  >
                    Clear filters <X size={13} />
                  </button>
                )}
              </div>
            </div>
            <div className="recommendation-key">
              <span>
                <span className="key-dot key-recommended" />
                MSDS Recommended
              </span>
              <span>
                <span className="key-dot key-specialty" />
                MSDS Specialty Elective
              </span>
              <span>
                <span className="key-dot key-catalog" />
                Explore from UConn Catalog
              </span>
              <a
                href="https://masters.datascience.uconn.edu/courses/"
                target="_blank"
                rel="noreferrer"
              >
                About elective approval <ArrowUpRight size={13} />
              </a>
            </div>
            {broaderCatalogCount > 0 && (
              <div className="catalog-collection-note">
                <BookOpen size={17} />
                <p><strong>{curatedCount} program-curated courses</strong> + <strong>{broaderCatalogCount} broader catalog courses</strong> across {departments.length} departments. Broader catalog suggestions require MSDS approval.</p>
              </div>
            )}
            {electivePool.length === 0 ? (
              <div className="pending-data-state">
                <div className="empty-state-icon">
                  <BookOpen size={29} strokeWidth={1.35} />
                </div>
                <div>
                  <span className="small-label">ACCURATE DATA COMES FIRST</span>
                  <h3>The elective collection is being verified.</h3>
                  <p>
                    Search is ready to connect your interests to courses once
                    the current MSDS recommended and specialty lists can be
                    confirmed. Explore the suggested pathways and core
                    foundations in the meantime.
                  </p>
                  <a
                    href="https://masters.datascience.uconn.edu/courses/"
                    className="text-link"
                    target="_blank"
                    rel="noreferrer"
                  >
                    View the official MSDS course list{" "}
                    <ArrowUpRight size={16} />
                  </a>
                </div>
              </div>
            ) : (
              <>
                <div className="results-header">
                  <p>
                    <strong>{recommendationResults.length}</strong>{" "}
                    {query || interests.length
                      ? "matches for your interests"
                      : "graduate courses to explore"}
                  </p>
                  <span>
                    <Sparkles size={14} />
                    Transparent matching · no AI key needed
                  </span>
                </div>
                <div className="elective-grid">
                  {recommendationResults
                    .slice(0, visibleElectives)
                    .map(({ course, reasons, matchedTags }) => (
                      <article className="elective-card" key={course.code}>
                        <div className="elective-top">
                          <StatusBadge course={course} />
                          <CreditLabel course={course} />
                        </div>
                        <button
                          className="elective-detail-button"
                          onClick={() => openCourse(course)}
                        >
                          <span className="course-code">
                            {course.code} <span> / {course.department}</span>
                          </span>
                          <h3>{course.title}</h3>
                          <p>
                            {course.studentDescription ??
                              course.officialDescription ??
                              "View the official source for course information."}
                          </p>
                        </button>
                        {reasons.length > 0 && (
                          <p className="match-reason">
                            <Sparkles size={14} />
                            <span>{reasons[0]}</span>
                          </p>
                        )}
                        <div className="course-tags elective-tags">
                          {(matchedTags.length ? matchedTags : course.tags)
                            .slice(0, 3)
                            .map((tag) => (
                              <span key={tag}>{readableTag(tag)}</span>
                            ))}
                        </div>
                        <p className="prerequisite-note">
                          {course.prerequisites
                            ? `Prerequisites: ${course.prerequisites}`
                            : "Prerequisites and availability: confirm with the official source."}
                        </p>
                        <div className="elective-card-actions">
                          <button
                            className="text-link small-text-link"
                            onClick={() => openCourse(course)}
                          >
                            Course details <ArrowUpRight size={15} />
                          </button>
                          <button
                            className={`shortlist-button ${selectedCodes.includes(course.code) ? "shortlisted" : ""}`}
                            onClick={() => toggleCourse(course)}
                            aria-pressed={selectedCodes.includes(course.code)}
                            aria-label={`${selectedCodes.includes(course.code) ? "Remove" : "Add"} ${course.code} ${selectedCodes.includes(course.code) ? "from" : "to"} your plan`}
                          >
                            {selectedCodes.includes(course.code) ? (
                              <Check size={15} />
                            ) : (
                              <Plus size={15} />
                            )}
                            {selectedCodes.includes(course.code)
                              ? "In my plan"
                              : "Shortlist"}
                          </button>
                        </div>
                      </article>
                    ))}
                </div>
                {recommendationResults.length > visibleElectives && (
                  <div className="load-more">
                    <span>
                      Showing {visibleElectives} of{" "}
                      {recommendationResults.length} electives
                    </span>
                    <button
                      className="button button-outline"
                      onClick={() => setVisibleElectives((count) => count + 9)}
                    >
                      Show more electives <Plus size={15} />
                    </button>
                  </div>
                )}
                {recommendationResults.length === 0 && (
                  <div className="no-results">
                    <Search size={25} />
                    <h3>A new direction might help.</h3>
                    <p>
                      Try a broader interest or clear a filter to find more
                      possibilities.
                    </p>
                    <button
                      className="text-link"
                      onClick={() => {
                        setQuery("");
                        setInterests([]);
                        setStatusFilter("all");
                        setDepartmentFilter("all");
                      }}
                    >
                      Show all electives <ArrowRight size={16} />
                    </button>
                  </div>
                )}
              </>
            )}
            <div className="plan-prompt">
              <div>
                <Bookmark size={23} strokeWidth={1.5} />
                <div>
                  <h3>Your plan starts with possibilities.</h3>
                  <p>
                    Shortlist a few courses. Compare the connections. Narrow
                    down to two.
                  </p>
                </div>
              </div>
              <button
                className="button button-outline"
                onClick={() => setPlanOpen(true)}
              >
                Open my elective plan <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </section>

        <section
          id="pathways"
          className="pathways-section section-space"
          aria-labelledby="pathways-title"
        >
          <div className="container">
            <SectionEyebrow number="04">A LITTLE DIRECTION</SectionEyebrow>
            <div className="section-heading">
              <h2 id="pathways-title">
                Different interests.
                <br />
                <em>Connected possibilities.</em>
              </h2>
              <p>
                See how a shared data science foundation can meet different
                domains. These suggested pathways are starting points for
                exploration.
              </p>
            </div>
            {signaturePathways.length > 0 && (
              <div className="signature-pathways">
                {signaturePathways.map((pathway, index) => {
                  const Icon = pathway.id === "sports-analytics" ? Trophy : BrainCircuit;
                  const previewCourses = pathway.electives.slice(0, pathway.electiveRange?.max ?? 3).map((code) => courses.find((course) => course.code === code)).filter((course): course is Course => !!course);
                  return (
                    <button key={pathway.id} className={`pathway-card signature-pathway ${index === 0 ? "signature-navy" : "signature-light"}`} onClick={() => setActivePathway(pathway)} aria-label={`Explore ${pathway.title} pathway`}>
                      <div className="signature-topline"><span><Icon size={20} strokeWidth={1.5} />SIGNATURE PATHWAY CONCEPT</span><ArrowUpRight size={21} /></div>
                      <h3>{pathway.title}</h3>
                      <p>{pathway.summary}</p>
                      <div className="signature-structure"><span>{pathway.electiveRange?.min ?? 2}–{pathway.electiveRange?.max ?? 3} course planning example</span><span>+ a topical capstone</span></div>
                      <div className="signature-course-preview">
                        {previewCourses.map((course, courseIndex) => <div key={course.code}><span className="signature-course-number">0{courseIndex + 1}</span><div><span className="signature-course-code">{course.code}</span><span className="signature-course-title">{course.title}</span></div>{courseIndex >= (pathway.electiveRange?.min ?? 2) && <span className="signature-optional">Optional third</span>}</div>)}
                      </div>
                      {pathway.capstone && <div className="signature-capstone"><GraduationCap size={20} strokeWidth={1.5} /><div><span>EXAMPLE CAPSTONE DIRECTION</span><strong>{pathway.capstone.title}</strong></div></div>}
                      <span className="signature-explore">Explore the combination <ArrowRight size={16} /></span>
                    </button>
                  );
                })}
              </div>
            )}
            <div className="pathway-grid">
              {otherPathways.map((pathway) => {
                const index = pathways.findIndex((item) => item.id === pathway.id);
                const Icon = pathwayIcons[index] ?? Compass;
                return (
                  <button
                    key={pathway.id}
                    className="pathway-card"
                    onClick={() => setActivePathway(pathway)}
                  >
                    <div className="pathway-topline">
                      <span
                        className={`pathway-icon pathway-color-${index % 4}`}
                      >
                        <Icon size={24} strokeWidth={1.5} />
                      </span>
                      <ArrowUpRight size={18} />
                    </div>
                    <span className="pathway-type">
                      {pathway.official
                        ? "OFFICIAL CONCENTRATION"
                        : "SUGGESTED PATHWAY"}
                    </span>
                    <h3>{pathway.title}</h3>
                    <p>{pathway.summary}</p>
                    <div className="pathway-keywords">
                      {pathway.tags.slice(0, 3).map((tag) => (
                        <span key={tag}>{readableTag(tag)}</span>
                      ))}
                    </div>
                  </button>
                );
              })}
              <div className="pathway-invitation">
                <span className="invitation-icon">
                  <Compass size={33} strokeWidth={1.15} />
                </span>
                <h3>
                  Your interests may
                  <br />
                  cross boundaries.
                </h3>
                <p>
                  That’s the point. Combine domains, follow a question, and make
                  the journey your own.
                </p>
                <a href="#explore" className="text-link">
                  Explore your combination <ArrowUpRight size={17} />
                </a>
              </div>
            </div>
            <p className="interpretation-note">
              <BookOpen size={14} />
              Suggested pathways are exploration tools, not official
              concentrations unless explicitly identified by the MSDS program.
            </p>
          </div>
        </section>

        <section
          id="guide"
          className="guide-section section-space"
          aria-labelledby="guide-title"
        >
          <div className="container guide-layout">
            <div className="guide-introduction">
              <SectionEyebrow number="05">THINK IT THROUGH</SectionEyebrow>
              <h2 id="guide-title">
                A guide to
                <br />
                <em>the possibilities.</em>
              </h2>
              <p>
                Ask about the curriculum, compare courses, or think through an
                elective combination.
              </p>
              <div className="guide-principle">
                <ShieldCheck size={18} />
                <div>
                  <strong>Grounded in the curriculum</strong>
                  <p>
                    A rules-based guide uses the course collection and program
                    structure. It works without an AI API and links to official
                    sources.
                  </p>
                </div>
              </div>
              <span className="guide-mode">
                <span />
                {guideMode === "ai"
                  ? "Curriculum guide · AI-assisted course focus"
                  : "Curriculum guide · rules-based guidance"}
              </span>
            </div>
            <div className="guide-workspace">
              <div className="guide-panel-header">
                <div className="guide-monogram">
                  <Network size={20} />
                </div>
                <div>
                  <strong>MSDS Curriculum Guide</strong>
                  <span>Good questions lead to better paths.</span>
                </div>
                <button
                  className="icon-button"
                  onClick={() => setGuideMessages([])}
                  disabled={guideMessages.length === 0 || guideBusy}
                  aria-label="Clear the conversation"
                >
                  <X size={18} />
                </button>
              </div>
              <div
                className="guide-conversation"
                aria-busy={guideBusy}
                role="log"
                aria-label="Curriculum guide conversation"
                aria-live="polite"
              >
                {guideMessages.length === 0 ? (
                  <div className="guide-welcome">
                    <p>
                      Where would you like to take your data science journey?
                    </p>
                    <span>Here are a few places to start.</span>
                    <div className="guide-suggestions">
                      {[
                        "How does causal inference fit into the core?",
                        "I’m interested in sports analytics.",
                        "How do my shortlisted electives fit together?",
                      ].map((question) => (
                        <button
                          key={question}
                          onClick={() => askGuide(question)}
                        >
                          {question}
                          <ArrowUpRight size={14} />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  guideMessages.map((message, index) => (
                    <div
                      key={index}
                      className={`guide-message guide-message-${message.role}`}
                    >
                      <span className="message-label">
                        {message.role === "guide" ? "CURRICULUM GUIDE" : "YOU"}
                      </span>
                      <p>{message.text}</p>
                      {message.sources && message.sources.length > 0 && (
                        <div className="guide-source-links">
                          {message.sources.map((source) => (
                            <a
                              key={`${source.label}|${source.url}`}
                              href={source.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {source.label}
                              <ExternalLink size={11} />
                            </a>
                          ))}
                        </div>
                      )}
                      {message.suggestedCourses &&
                        message.suggestedCourses.length > 0 && (
                          <div className="guide-course-links">
                            {message.suggestedCourses.map((code) => {
                              const course = courses.find(
                                (item) => item.code === code,
                              );
                              return course ? (
                                <button
                                  key={code}
                                  onClick={() => openCourse(course)}
                                >
                                  {code}
                                  <ArrowUpRight size={12} />
                                </button>
                              ) : null;
                            })}
                          </div>
                        )}
                    </div>
                  ))
                )}
              </div>
              <form
                className="guide-input-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  askGuide(guideInput);
                }}
              >
                <label htmlFor="guide-question" className="sr-only">
                  Ask the curriculum guide a question
                </label>
                <input
                  id="guide-question"
                  value={guideInput}
                  onChange={(event) => setGuideInput(event.target.value)}
                  placeholder="Ask about courses, interests, or your plan…"
                  maxLength={1000}
                  disabled={guideBusy}
                />
                <button
                  type="submit"
                  aria-label={
                    guideBusy ? "Preparing guide response" : "Send question"
                  }
                  disabled={!guideInput.trim() || guideBusy}
                >
                  <Send size={18} />
                </button>
              </form>
              <p className="guide-privacy">
                Exploration, not formal advising. No conversation is saved.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container">
          <div className="footer-top">
            <div>
              <a className="footer-wordmark" href="#main-content">
                UCONN <span>DATA SCIENCE</span>
              </a>
              <p>Strong foundations. Modern tools. Meaningful impact.</p>
            </div>
            <div className="footer-links">
              <a
                href="https://masters.datascience.uconn.edu/"
                target="_blank"
                rel="noreferrer"
              >
                MSDS program <ArrowUpRight size={14} />
              </a>
              <a href={program.sourceUrl} target="_blank" rel="noreferrer">
                Graduate Catalog <ArrowUpRight size={14} />
              </a>
              <a
                href="https://masters.datascience.uconn.edu/courses/"
                target="_blank"
                rel="noreferrer"
              >
                Official course list <ArrowUpRight size={14} />
              </a>
            </div>
          </div>
          <p className="advising-disclaimer">{program.disclaimer}</p>
          <div className="footer-bottom">
            <span>UConn MSDS Curriculum Explorer</span>
            <span>Standalone curriculum planning prototype</span>
          </div>
        </div>
      </footer>

      <button
        className={`persistent-plan ${selectedCodes.length === 0 && activeNav === "journey" ? "plan-idle" : ""}`}
        onClick={() => {
          setActiveCourse(null);
          setActivePathway(null);
          setPlanOpen(true);
        }}
        aria-label={`Open my elective plan, ${selectedCodes.length} courses shortlisted`}
      >
        <Bookmark size={17} />
        <span>My elective plan</span>
        <span className="plan-count">{selectedCodes.length}</span>
        <span className="tray-label">shortlisted</span>
        <ArrowUpRight size={16} />
      </button>

      {activeCourse && (
        <Modal
          id="course-detail-title"
          title="COURSE EXPLORER"
          onClose={closeCourse}
        >
          <div className="detail-heading">
            <div className="detail-code-row">
              <span className="course-code">{activeCourse.code}</span>
              <CreditLabel course={activeCourse} />
            </div>
            <h2 id="course-detail-title">{activeCourse.title}</h2>
            <StatusBadge course={activeCourse} />
          </div>
          <div className="detail-content">
            <section className="detail-section student-summary">
              <span className="detail-section-label">
                <Compass size={15} />
                STUDENT-FACING LEARNING SUMMARY
              </span>
              <p>
                {activeCourse.studentDescription ??
                  "A student-facing summary is not available yet. Consult the official course source below."}
              </p>
              <small>
                Interpretive guidance, separate from the official catalog
                description.
              </small>
            </section>
            <section className="detail-section">
              <h3>Its place in the journey</h3>
              <div className="detail-capabilities">
                {activeCourse.capabilities.map((id) => {
                  const capability = capabilities.find(
                    (item) => item.id === id,
                  );
                  return capability ? (
                    <div key={id}>
                      <Check size={14} />
                      <span>{capability.title}</span>
                    </div>
                  ) : null;
                })}
              </div>
            </section>
            <section className="detail-section">
              <span className="detail-section-label">
                <BookOpen size={15} />
                OFFICIAL COURSE DESCRIPTION
              </span>
              <p>
                {activeCourse.officialDescription ??
                  "The official catalog description has not been verified for this collection. Read the linked UConn source for the authoritative description."}
              </p>
            </section>
            <section className="detail-section">
              <h3>Prerequisites & enrollment</h3>
              <p>
                {activeCourse.prerequisites ??
                  "Requirements are not yet verified in this collection. Check the official catalog and confirm eligibility with the program or instructor."}
              </p>
              {activeCourse.kind === "elective" && (
                <p className="detail-advisory">
                  {activeCourse.approvalRequired === true
                    ? "Program approval is required. "
                    : "Confirm degree-plan approval with the MSDS program. "}
                  A recommendation does not guarantee enrollment, availability,
                  or credit toward your degree.
                </p>
              )}
            </section>
            <section className="detail-section">
              <h3>Related core foundations</h3>
              <div className="related-courses">
                {coreCourses
                  .filter(
                    (course) =>
                      course.code !== activeCourse.code &&
                      course.capabilities.some((capability) =>
                        activeCourse.capabilities.includes(capability),
                      ),
                  )
                  .slice(0, 4)
                  .map((course) => (
                    <button
                      key={course.code}
                      onClick={() => setActiveCourse(course)}
                    >
                      <span>{course.code}</span>
                      {course.title}
                      <ArrowUpRight size={14} />
                    </button>
                  ))}
              </div>
            </section>
            <div className="source-record">
              <span className="small-label">SOURCE & FRESHNESS</span>
              <p>
                {activeCourse.sourceType === "user-provided"
                  ? "User-provided curriculum seed"
                  : `${readableTag(activeCourse.sourceType)} source`}
                {activeCourse.sourceVerification === "verified"
                  ? " · verified"
                  : " · verification pending"}
              </p>
              <span>
                {activeCourse.lastChecked
                  ? `Last checked ${activeCourse.lastChecked}`
                  : "Official metadata has not yet been confirmed."}
              </span>
              {activeCourse.sourceNotes && (
                <p className="source-note">{activeCourse.sourceNotes}</p>
              )}
              {activeCourse.delivery !== "unknown" && (
                <span>
                  Delivery recorded as {activeCourse.delivery}. Current offering
                  availability is not established.
                </span>
              )}
              <a
                className="text-link"
                href={activeCourse.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open official course source <ExternalLink size={15} />
              </a>
              {activeCourse.curationSourceUrl && (
                <a
                  className="text-link"
                  href={activeCourse.curationSourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  View MSDS curation source <ExternalLink size={15} />
                </a>
              )}
            </div>
          </div>
          {activeCourse.kind === "elective" && (
            <div className="modal-bottom-actions">
              <button
                className="button button-primary"
                onClick={() => toggleCourse(activeCourse)}
              >
                {selectedCodes.includes(activeCourse.code) ? (
                  <Check size={16} />
                ) : (
                  <Plus size={16} />
                )}
                {selectedCodes.includes(activeCourse.code)
                  ? "Remove from my plan"
                  : "Add to my elective plan"}
              </button>
            </div>
          )}
        </Modal>
      )}

      {activePathway && (
        <Modal
          id="pathway-detail-title"
          title="PATHWAY EXPLORER"
          onClose={closePathway}
        >
          <div className="detail-heading">
            <span className="small-label">
              {activePathway.official
                ? "OFFICIAL CONCENTRATION"
                : "SUGGESTED PATHWAY · EXPLORATORY"}
            </span>
            <h2 id="pathway-detail-title">{activePathway.title}</h2>
            <p>{activePathway.summary}</p>
          </div>
          <div className="detail-content">
            <section className="detail-section">
              <h3>Questions you could explore</h3>
              <ul className="application-list">
                {activePathway.applications.map((application) => (
                  <li key={application}>
                    <Lightbulb size={16} />
                    {application}
                  </li>
                ))}
              </ul>
            </section>
            <section className="detail-section">
              <h3>Your core-course foundations</h3>
              <div className="related-courses">
                {activePathway.coreCourses.map((code) => {
                  const course = courses.find((item) => item.code === code);
                  return course ? (
                    <button key={code} onClick={() => openCourse(course)}>
                      <span>{code}</span>
                      {course.title}
                      <ArrowUpRight size={14} />
                    </button>
                  ) : null;
                })}
              </div>
            </section>
            <section className="detail-section">
              <h3>Elective possibilities</h3>
              {activePathway.electives.length ? (
                <div className="related-courses">
                  {activePathway.electives.map((code) => {
                    const course = courses.find((item) => item.code === code);
                    return course ? (
                      <button key={code} onClick={() => openCourse(course)}>
                        <span>{code}</span>
                        {course.title}
                        <ArrowUpRight size={14} />
                      </button>
                    ) : null;
                  })}
                </div>
              ) : (
                <p>
                  Course assignments are awaiting verification from the current
                  MSDS elective list. The themes below offer a starting point
                  for a conversation with the program.
                </p>
              )}
              <div className="course-tags detail-tags">
                {activePathway.tags.map((tag) => (
                  <span key={tag}>{readableTag(tag)}</span>
                ))}
              </div>
            </section>
            {activePathway.catalogCourses.length > 0 && (
              <section className="detail-section">
                <h3>Explore the broader catalog</h3>
                <p>
                  These courses are not automatically approved MSDS electives.
                </p>
                <div className="related-courses">
                  {activePathway.catalogCourses.map((code) => {
                    const course = courses.find((item) => item.code === code);
                    return course ? (
                      <button key={code} onClick={() => openCourse(course)}>
                        <span>{code}</span>
                        {course.title}
                        <ArrowUpRight size={14} />
                      </button>
                    ) : null;
                  })}
                </div>
              </section>
            )}
            <section className="detail-section">
              <h3>Application & career directions</h3>
              <div className="course-tags detail-tags">
                {activePathway.careers.map((career) => (
                  <span key={career}>{career}</span>
                ))}
              </div>
            </section>
            <p className="detail-advisory">
              Suggested pathways help organize your exploration. Confirm
              elective requirements, availability, and degree-plan approval with
              the MSDS program.
            </p>
          </div>
          <div className="modal-bottom-actions">
            <a
              href="#explore"
              className="button button-primary"
              onClick={() => {
                setQuery("");
                setInterests(activePathway.tags.map(readableTag));
                setActivePathway(null);
              }}
            >
              Explore these interests <ArrowRight size={16} />
            </a>
          </div>
        </Modal>
      )}

      {planOpen && (
        <Modal
          id="plan-detail-title"
          title="YOUR ELECTIVE SHORTLIST"
          onClose={closePlan}
          wide
        >
          <div className="detail-heading plan-detail-heading">
            <span className="small-label">
              EXPLORE FIRST. NARROW DOWN LATER.
            </span>
            <h2 id="plan-detail-title">My elective plan</h2>
            <p>
              Your degree includes {program.electiveCount} electives /{" "}
              {program.credits.electives} credits. Shortlist more while
              exploring your options.
            </p>
            <div className="plan-progress">
              <span
                className={selectedCourses.length > 0 ? "plan-step-filled" : ""}
              />
              <span
                className={selectedCourses.length > 1 ? "plan-step-filled" : ""}
              />
              <span>
                {selectedCourses.length} shortlisted <span>·</span>{" "}
                {selectedCourses.every((course) => course.credits !== null)
                  ? `${selectedCourses.reduce((sum, course) => sum + (course.credits ?? 0), 0)} known credits`
                  : "Some credits to verify"}
              </span>
            </div>
          </div>
          <div className="detail-content">
            {selectedCourses.length === 0 ? (
              <div className="plan-empty">
                <Bookmark size={37} strokeWidth={1.2} />
                <h3>Start with a little curiosity.</h3>
                <p>
                  Add courses from the elective explorer to see how their themes
                  and skills fit together.
                </p>
                <a
                  href="#explore"
                  className="button button-primary"
                  onClick={closePlan}
                >
                  Explore electives <ArrowRight size={16} />
                </a>
              </div>
            ) : (
              <div className="plan-detail-layout">
                <div className="plan-course-list">
                  {selectedCourses.map((course) => (
                    <article className="plan-course" key={course.code}>
                      <div>
                        <StatusBadge course={course} />
                        <button onClick={() => openCourse(course)}>
                          <span className="course-code">{course.code}</span>
                          <h3>{course.title}</h3>
                        </button>
                        <CreditLabel course={course} />
                      </div>
                      <button
                        className="icon-button"
                        onClick={() => toggleCourse(course)}
                        aria-label={`Remove ${course.code} from your plan`}
                      >
                        <X size={17} />
                      </button>
                    </article>
                  ))}
                </div>
                <div className="plan-analysis">
                  <span className="detail-section-label">
                    <Sparkles size={15} />
                    HOW THE PIECES FIT
                  </span>
                  <h3>{planAnalysis.headline}</h3>
                  {planAnalysis.comments.map((comment) => (
                    <p key={comment}>{comment}</p>
                  ))}
                  {planAnalysis.themes.length > 0 && (
                    <div className="course-tags detail-tags">
                      {planAnalysis.themes.map((theme) => (
                        <span key={theme}>{readableTag(theme)}</span>
                      ))}
                    </div>
                  )}
                  {planAnalysis.suggestedPathway && (
                    <p className="plan-pathway-note">
                      <Compass size={16} />
                      Possible direction:{" "}
                      {pathways.find(
                        (pathway) =>
                          pathway.id === planAnalysis.suggestedPathway,
                      )?.title ?? planAnalysis.suggestedPathway}
                    </p>
                  )}
                  {planAnalysis.warnings.map((warning) => (
                    <p key={warning} className="plan-warning">
                      {warning}
                    </p>
                  ))}
                </div>
              </div>
            )}
            <p className="plan-privacy">
              <ShieldCheck size={14} />
              Only course codes are saved in this browser. This shortlist is
              advisory and has not been approved by the MSDS program.
            </p>
          </div>
        </Modal>
      )}
    </>
  );
}
