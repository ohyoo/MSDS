import coreData from "../../data/core-courses.json";
import electiveData from "../../data/electives.json";
import catalogData from "../../data/catalog/courses.json";
import coverageData from "../../data/catalog/coverage.json";
import pathwayData from "../../data/pathways.json";
import capabilityData from "../../data/capabilities.json";
import programData from "../../data/program.json";
import {
  capabilitiesSchema,
  catalogCoverageSchema,
  coursesSchema,
  pathwaysSchema,
  programSchema,
} from "./schema";

export const coreCourses = coursesSchema.parse(coreData);
export const electives = coursesSchema.parse(electiveData);
export const catalogIndex = coursesSchema.parse(catalogData);
export const catalogCoverage = catalogCoverageSchema.parse(coverageData);
export const pathways = pathwaysSchema.parse(pathwayData);
export const capabilities = capabilitiesSchema.parse(capabilityData);
export const program = programSchema.parse(programData);

const curatedCodes = new Set(
  [...coreCourses, ...electives].map((course) => course.code),
);
export const catalogCourses = catalogIndex.filter(
  (course) => !curatedCodes.has(course.code),
);
export const courses = [...coreCourses, ...electives, ...catalogCourses];

export const getCourse = (code: string) =>
  courses.find((course) => course.code === code);
export const getCapability = (id: string) =>
  capabilities.find((capability) => capability.id === id);
export const getPathway = (id: string) =>
  pathways.find((pathway) => pathway.id === id);

export function getSourceFreshness(
  lastChecked: string | null,
  now = new Date(),
): "unknown" | "current" | "review-needed" {
  if (!lastChecked) return "unknown";
  const ageDays =
    (now.getTime() - new Date(`${lastChecked}T00:00:00Z`).getTime()) /
    86_400_000;
  return ageDays > 180 ? "review-needed" : "current";
}
