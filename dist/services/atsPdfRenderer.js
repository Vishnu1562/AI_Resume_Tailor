export function renderAtsHtml(tailored, personalInfo) {
    const contactParts = [];
    if (personalInfo.location)
        contactParts.push(personalInfo.location);
    if (personalInfo.phone)
        contactParts.push(personalInfo.phone);
    if (personalInfo.email) {
        contactParts.push(`<a href="mailto:${personalInfo.email}">${personalInfo.email}</a>`);
    }
    if (personalInfo.linkedin) {
        contactParts.push(`<a href="${personalInfo.linkedin}" target="_blank">LinkedIn</a>`);
    }
    if (personalInfo.github) {
        contactParts.push(`<a href="${personalInfo.github}" target="_blank">GitHub</a>`);
    }
    const skillsHtml = Object.entries(tailored.prioritizedSkills)
        .map(([category, list]) => `<div class="skill-row"><strong>${escapeHtml(category)}:</strong> ${list.map(escapeHtml).join(', ')}</div>`)
        .join('\n');
    const experienceHtml = tailored.experience
        .map((exp) => `
    <div class="entry">
      <div class="entry-header">
        <span class="entry-title"><strong>${escapeHtml(exp.role)}</strong> | ${escapeHtml(exp.company)}</span>
        <span class="entry-meta">${escapeHtml(exp.location || '')}${exp.location && exp.period ? ' &bull; ' : ''}${escapeHtml(exp.period || '')}</span>
      </div>
      <ul class="entry-bullets">
        ${exp.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('\n')}
      </ul>
    </div>
  `)
        .join('\n');
    const projectsHtml = tailored.projects
        .map((proj) => `
    <div class="entry">
      <div class="entry-header">
        <span class="entry-title"><strong>${escapeHtml(proj.name)}</strong>${proj.techStack ? ` (${escapeHtml(proj.techStack)})` : ''}</span>
      </div>
      <ul class="entry-bullets">
        ${proj.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('\n')}
      </ul>
    </div>
  `)
        .join('\n');
    const educationHtml = (tailored.education || [])
        .map((edu) => `
    <div class="entry-header">
      <span class="entry-title"><strong>${escapeHtml(edu.degree)}</strong> – ${escapeHtml(edu.institution)}</span>
      <span class="entry-meta">${escapeHtml(edu.year || '')}</span>
    </div>
  `)
        .join('\n');
    const certificationsHtml = (tailored.certifications || [])
        .map((cert) => `<li>${escapeHtml(cert)}</li>`)
        .join('\n');
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(personalInfo.fullName)} - Resume (${escapeHtml(tailored.company)})</title>
  <style>
    @page {
      size: letter;
      margin: 0.4in 0.45in;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.35;
      color: #111827;
      background: #ffffff;
    }
    .header {
      text-align: center;
      margin-bottom: 12px;
      border-bottom: 1.5px solid #1f2937;
      padding-bottom: 6px;
    }
    .name {
      font-size: 19pt;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: #111827;
      margin-bottom: 3px;
    }
    .target-role {
      font-size: 10.5pt;
      font-weight: 600;
      color: #374151;
      margin-bottom: 4px;
    }
    .contact {
      font-size: 9pt;
      color: #4b5563;
    }
    .contact a {
      color: #1d4ed8;
      text-decoration: none;
    }
    .section {
      margin-bottom: 10px;
    }
    .section-title {
      font-size: 10pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #111827;
      border-bottom: 1px solid #d1d5db;
      padding-bottom: 2px;
      margin-bottom: 5px;
    }
    .summary-text {
      text-align: justify;
      color: #1f2937;
    }
    .skill-row {
      margin-bottom: 2px;
    }
    .entry {
      margin-bottom: 7px;
      page-break-inside: avoid;
    }
    .entry-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 2px;
    }
    .entry-title {
      color: #111827;
    }
    .entry-meta {
      font-size: 9pt;
      color: #4b5563;
      white-space: nowrap;
    }
    .entry-bullets {
      margin-left: 18px;
      margin-top: 2px;
    }
    .entry-bullets li {
      margin-bottom: 2px;
      color: #1f2937;
    }
    ul.simple-list {
      margin-left: 18px;
    }
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="name">${escapeHtml(personalInfo.fullName)}</div>
    <div class="target-role">${escapeHtml(tailored.jobTitle)} &bull; ${escapeHtml(tailored.company)}</div>
    <div class="contact">${contactParts.join(' &bull; ')}</div>
  </div>

  <div class="section">
    <div class="section-title">PROFESSIONAL SUMMARY</div>
    <p class="summary-text">${escapeHtml(tailored.tailoredSummary)}</p>
  </div>

  <div class="section">
    <div class="section-title">TECHNICAL SKILLS</div>
    ${skillsHtml}
  </div>

  <div class="section">
    <div class="section-title">PROFESSIONAL EXPERIENCE</div>
    ${experienceHtml}
  </div>

  ${tailored.projects && tailored.projects.length > 0
        ? `
  <div class="section">
    <div class="section-title">PERSONAL PROJECTS</div>
    ${projectsHtml}
  </div>
  `
        : ''}

  ${tailored.education && tailored.education.length > 0
        ? `
  <div class="section">
    <div class="section-title">EDUCATION</div>
    ${educationHtml}
  </div>
  `
        : ''}

  ${certificationsHtml
        ? `
  <div class="section">
    <div class="section-title">CERTIFICATIONS</div>
    <ul class="simple-list">${certificationsHtml}</ul>
  </div>
  `
        : ''}
</body>
</html>`;
}
export function formatAsMarkdown(tailored, personalInfo) {
    const contactParts = [];
    if (personalInfo.location)
        contactParts.push(personalInfo.location);
    if (personalInfo.phone)
        contactParts.push(personalInfo.phone);
    if (personalInfo.email)
        contactParts.push(`[${personalInfo.email}](mailto:${personalInfo.email})`);
    if (personalInfo.linkedin)
        contactParts.push(`[LinkedIn](${personalInfo.linkedin})`);
    if (personalInfo.github)
        contactParts.push(`[GitHub](${personalInfo.github})`);
    let md = `# ${personalInfo.fullName}\n`;
    md += `**${tailored.jobTitle}** • ${tailored.company}\n`;
    md += `${contactParts.join(' • ')}\n\n---\n\n`;
    md += `## PROFESSIONAL SUMMARY\n${tailored.tailoredSummary}\n\n---\n\n`;
    md += `## TECHNICAL SKILLS\n`;
    for (const [category, list] of Object.entries(tailored.prioritizedSkills)) {
        md += `* **${category}**: ${list.join(', ')}\n`;
    }
    md += `\n---\n\n`;
    md += `## PROFESSIONAL EXPERIENCE\n\n`;
    for (const exp of tailored.experience) {
        md += `### **${exp.role}** | **${exp.company}**\n`;
        if (exp.location || exp.period) {
            md += `*${[exp.location, exp.period].filter(Boolean).join(' • ')}*\n\n`;
        }
        for (const bullet of exp.bullets) {
            md += `* ${bullet}\n`;
        }
        md += `\n`;
    }
    if (tailored.projects && tailored.projects.length > 0) {
        md += `---\n\n## PERSONAL PROJECTS\n\n`;
        for (const proj of tailored.projects) {
            md += `### **${proj.name}**${proj.techStack ? ` (${proj.techStack})` : ''}\n`;
            for (const bullet of proj.bullets) {
                md += `* ${bullet}\n`;
            }
            md += `\n`;
        }
    }
    if (tailored.education && tailored.education.length > 0) {
        md += `---\n\n## EDUCATION\n\n`;
        for (const edu of tailored.education) {
            md += `**${edu.degree}**  \n*${edu.institution}* ${edu.year ? `• *${edu.year}*` : ''}\n\n`;
        }
    }
    if (tailored.certifications && tailored.certifications.length > 0) {
        md += `---\n\n## CERTIFICATIONS\n\n`;
        for (const cert of tailored.certifications) {
            md += `* ${cert}\n`;
        }
    }
    return md;
}
function escapeHtml(text) {
    if (!text)
        return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
