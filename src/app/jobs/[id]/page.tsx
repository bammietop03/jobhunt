import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  MapPin,
  Clock3,
  ShieldCheck,
  Bookmark,
} from "lucide-react";
import { db } from "@/lib/db";
import { saveJob, updateApplication } from "@/app/actions";
export const dynamic = "force-dynamic";
export default async function JobDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await db.job.findUnique({
    where: { id },
    include: { company: true, saved: true, application: true },
  });
  if (!job || (job.remoteType !== "REMOTE" && !job.saved && (!job.application || job.application.status === "NOT_APPLIED"))) notFound();
  const date = (value: Date | null) =>
    value
      ? value.toLocaleDateString("en-NG", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "Not provided";
  return (
    <div className="content">
      <Link
        href="/"
        className="subtle"
        style={{
          display: "inline-flex",
          gap: 7,
          alignItems: "center",
          fontSize: 13,
          marginBottom: 18,
        }}
      >
        <ArrowLeft size={15} /> All jobs
      </Link>
      <div className="card job-detail-header">
        <div className="job-header-top">
          <div className="eyebrow">
            {job.companyName} · {job.provider}
          </div>
          <span className={`score ${job.matchScore < 50 ? "low" : ""}`}>
            {job.matchScore}% match
          </span>
        </div>
        <h1 className="heading job-title-main">
          {job.title}
        </h1>
        <div className="meta" style={{ marginTop: 14, fontSize: 13 }}>
          <span>
            <MapPin size={15} />
            {job.location ?? "Location not listed"}
          </span>
          <span>
            <Clock3 size={15} />
            Published {date(job.sourcePublishedAt)}
          </span>
          <span>
            <ShieldCheck size={15} />
            {job.nigeriaEligibility.replace("_", " ").toLowerCase()}
          </span>
        </div>
        <div className="tag-row" style={{ marginTop: 18 }}>
          {job.requiredSkills.map((skill) => (
            <span className="tag" key={skill}>
              {skill}
            </span>
          ))}
        </div>
        <div className="job-actions">
          <a
            href={job.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            Apply on original site <ArrowUpRight size={15} />
          </a>
          <form
            action={async () => {
              "use server";
              await saveJob(job.id, !job.saved);
            }}
          >
            <button className="btn">
              <Bookmark size={15} />
              {job.saved ? "Remove saved" : "Save job"}
            </button>
          </form>
          <form
            action={async () => {
              "use server";
              const f = new FormData();
              f.set("jobId", job.id);
              f.set("status", "APPLIED");
              await updateApplication(f);
            }}
          >
            <button className="btn">Mark as applied</button>
          </form>
        </div>
      </div>
      <div className="job-detail-grid">
        <section className="card job-detail-main">
          <h2 style={{ fontSize: 19, fontWeight: 800, marginBottom: 16 }}>
            Full job description
          </h2>
          <div className="prose">
            {job.descriptionText || "The source did not provide a description."}
          </div>
          {(
            [
              ["Responsibilities", job.responsibilities],
              ["Qualifications", job.qualifications],
              ["Benefits", job.benefits],
            ] as const
          )
            .filter(([, items]) => items.length)
            .map(([title, items]) => (
              <section key={title} style={{ marginTop: 25 }}>
                <h3 style={{ fontWeight: 800, marginBottom: 8 }}>{title}</h3>
                <ul className="job-list">
                  {items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </section>
            ))}
        </section>
        <aside className="job-detail-sidebar">
          <div className="card job-aside-card">
            <div className="eyebrow">MATCH ANALYSIS</div>
            <div style={{ fontSize: 35, fontWeight: 800, margin: "8px 0" }}>
              {job.matchScore}
              <span style={{ fontSize: 16, color: "var(--muted)" }}>/100</span>
            </div>
            {job.matchReasons.map((reason) => (
              <div key={reason} style={{ fontSize: 12, marginTop: 10 }}>
                ✓ {reason}
              </div>
            ))}
          </div>
          <div className="card job-aside-card">
            <h3 style={{ fontWeight: 800 }}>At a glance</h3>
            <dl className="glance-dl">
              <div className="glance-item">
                <dt>Workplace</dt>
                <dd>{job.remoteType.toLowerCase()}</dd>
              </div>
              <div className="glance-item">
                <dt>Eligibility from Nigeria</dt>
                <dd>{job.eligibilityReason ?? "Unknown"}</dd>
              </div>
              <div className="glance-item">
                <dt>Salary</dt>
                <dd>
                  {job.salaryMin
                    ? `${job.currency ?? ""} ${job.salaryMin.toLocaleString()}${job.salaryMax ? `–${job.salaryMax.toLocaleString()}` : ""} ${job.salaryPeriod ?? ""}`
                    : "Not advertised"}
                </dd>
              </div>
              <div className="glance-item">
                <dt>Employment</dt>
                <dd>{job.employmentType ?? "Not specified"}</dd>
              </div>
              <div className="glance-item">
                <dt>Experience</dt>
                <dd>{job.experienceLevel ?? "Not specified"}</dd>
              </div>
              <div className="glance-item">
                <dt>Last verified</dt>
                <dd>{date(job.lastVerifiedAt)}</dd>
              </div>
            </dl>
          </div>
          <a
            className="btn btn-block"
            href={job.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            View original listing <ArrowUpRight size={14} />
          </a>
        </aside>
      </div>
    </div>
  );
}
