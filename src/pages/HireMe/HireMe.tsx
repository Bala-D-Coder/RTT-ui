import { useState, type FormEvent } from 'react'
import { Briefcase, Check, Clock, Code2, Globe, Send, Sparkles, UserCheck, Zap } from 'lucide-react'
import { useModal } from '@/context/ModalContext'
import { submitHireInvitation } from '@/services/feedback'
import styles from './HireMe.module.css'

export function HireMe() {
  const modal = useModal()
  const [company, setCompany] = useState('')
  const [contactName, setContactName] = useState('')
  const [email, setEmail] = useState('')
  const [interviewType, setInterviewType] = useState('Technical Interview')
  const [roleTitle, setRoleTitle] = useState('')
  const [proposedTime, setProposedTime] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!company.trim() || !contactName.trim() || !email.trim()) {
      await modal.alert({
        title: 'Information Required',
        message: 'Please fill in your company, contact name, and work email to send an interview invitation.',
        variant: 'warning',
      })
      return
    }

    setSubmitting(true)
    try {
      await submitHireInvitation({
        company: company.trim(),
        contactName: contactName.trim(),
        email: email.trim(),
        interviewType,
        roleTitle: roleTitle.trim() || undefined,
        proposedTime: proposedTime.trim() || undefined,
        message: message.trim() || undefined,
      })
      setSubmitted(true)
    } catch (err) {
      await modal.alert({
        title: 'Invitation Failed',
        message: 'Failed to submit invitation: ' + (err as Error).message,
        variant: 'danger',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <div className={styles.headerTitleWrap}>
          <span className={styles.badge}>
            <Briefcase size={12} /> Opportunities
          </span>
          <h1 className={styles.title}>Invite for Interview / Hire</h1>
        </div>
        <p className={styles.subtitle}>
          Interested in scheduling an evaluation round or offering a role? Connect directly below.
        </p>
      </header>

      <section className={styles.splitCard}>
        {/* Left Column: Candidate Highlights & Skills */}
        <aside className={styles.leftCol}>
          <div className={styles.candidateInfo}>
            <div className={styles.avatarBox}>
              <div className={styles.avatarIcon}>
                <Code2 size={24} />
              </div>
              <div>
                <div className={styles.candidateName}>Full-Stack Engineer</div>
                <div className={styles.candidateTitle}>Available for Hire</div>
              </div>
            </div>

            <p className={styles.pitchText}>
              Full Stack Engineer with hands-on experience building multi-tenant SaaS and identity systems. Experienced in JWT-based SSO, role-based access control (RBAC),
              REST API design, and third-party data integrations</p>

            <div className={styles.skillPills}>
              <span className={styles.skillPill}>Spring Boot</span>
              <span className={styles.skillPill}>MERN</span>
              <span className={styles.skillPill}>PostgreSQL</span>
              <span className={styles.skillPill}>Git / Github</span>
              <span className={styles.skillPill}>S3 / R2</span>
              <span className={styles.skillPill}>Docker</span>
            </div>

            <div className={styles.highlightsList}>
              <div className={styles.highlightItem}>
                <Zap size={14} style={{ color: 'var(--accent)' }} />
                <span>Notice: <strong>Immediate Joiner</strong></span>
              </div>
              <div className={styles.highlightItem}>
                <UserCheck size={14} style={{ color: '#4ade80' }} />
                <span>Rounds: <strong>Tech, System Design, HR</strong></span>
              </div>
              <div className={styles.highlightItem}>
                <Globe size={14} style={{ color: '#60a5fa' }} />
                <span>Location: <strong>Remote / Hybrid / On-site</strong></span>
              </div>
              <div className={styles.highlightItem}>
                <Clock size={14} style={{ color: '#facc15' }} />
                <span>Response: <strong>&lt; 2 Hours</strong></span>
              </div>
            </div>
          </div>

          <div className={styles.recruiterNote}>
            ✓ Submissions sync in real-time to Google Sheets and alert me immediately on mobile.
          </div>
        </aside>

        {/* Right Column: Interactive Invitation Form */}
        <div className={styles.rightCol}>
          {submitted ? (
            <div className={styles.successCard}>
              <div className={styles.successIcon}>
                <Check size={32} />
              </div>
              <h2 className={styles.successTitle}>Interview Request Sent!</h2>
              <p className={styles.successDesc}>
                Thank you for considering me. Your invitation has been recorded and delivered. I will reach out to <strong>{email}</strong> shortly.
              </p>
              <button
                type="button"
                className={styles.sendAnotherBtn}
                onClick={() => {
                  setSubmitted(false)
                  setCompany('')
                  setMessage('')
                }}
              >
                Submit Another Request
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="company-name">
                    Company / Organization *
                  </label>
                  <input
                    id="company-name"
                    type="text"
                    required
                    placeholder="e.g. TCS, Google, Startup"
                    className={styles.input}
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="contact-name">
                    Recruiter / Interviewer Name *
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    placeholder="e.g. Priya Sharma"
                    className={styles.input}
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="contact-email">
                    Work Email Address *
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    placeholder="e.g. interviewer@tcs.com"
                    className={styles.input}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="interview-type">
                    Opportunity / Discussion Stage
                  </label>
                  <select
                    id="interview-type"
                    className={styles.select}
                    value={interviewType}
                    onChange={(e) => setInterviewType(e.target.value)}
                  >
                    <option value="Technical Interview">Technical Round (Coding / System Design)</option>
                    <option value="HR Discussion">HR Discussion / Screening Round</option>
                    <option value="Managerial Round">Managerial / Team Fit Discussion</option>
                    <option value="Full-Time Offer">Full-Time Job Offer</option>
                    <option value="Contract Project">Consulting / Contract Engagement</option>
                  </select>
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="role-title">
                    Role Title & Compensation
                  </label>
                  <input
                    id="role-title"
                    type="text"
                    placeholder="e.g. Senior Software Engineer / CTC"
                    className={styles.input}
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="proposed-time">
                    Proposed Date & Time / Availability
                  </label>
                  <input
                    id="proposed-time"
                    type="text"
                    placeholder="e.g. Tomorrow 3:00 PM IST or Weekday afternoons"
                    className={styles.input}
                    value={proposedTime}
                    onChange={(e) => setProposedTime(e.target.value)}
                  />
                </div>

                <div className={styles.fullWidth}>
                  <label className={styles.label} htmlFor="message-notes">
                    Meeting Link / Notes / Job Description
                  </label>
                  <textarea
                    id="message-notes"
                    placeholder="Add meeting links, required skills, or JD notes here…"
                    className={styles.textarea}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" disabled={submitting} className={styles.submitBtn}>
                {submitting ? <Sparkles size={16} /> : <Send size={16} />}
                {submitting ? 'Sending Invitation…' : 'Send Interview Invitation'}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  )
}

export default HireMe
