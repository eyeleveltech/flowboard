const S = {
  IDEA:           { bg: '#F5F5F5', color: '#6B6B6B', border: 'rgba(0,0,0,0.08)', label: 'Idea' },
  DRAFT:          { bg: '#EAEAEA', color: '#3A3A3A', border: 'rgba(0,0,0,0.12)', label: 'Draft' },
  REVIEW:         { bg: '#FFFBE6', color: '#D48806', border: 'rgba(250,173,20,0.3)', label: 'In Review' },
  APPROVED:       { bg: '#4A4A4A', color: '#FFFFFF', border: 'rgba(0,0,0,0)',    label: 'Approved' },
  CLIENT_APPROVED:{ bg: '#1A1A1A', color: '#FFFFFF', border: 'rgba(0,0,0,0)',    label: 'Client Approved' },
  SCHEDULED:      { bg: '#E6F4FF', color: '#0958D9', border: 'rgba(22,119,255,0.3)', label: 'Scheduled' },
  PUBLISHED:      { bg: '#F6FFED', color: '#389E0D', border: 'rgba(82,196,26,0.3)', label: 'Published' },
  PAUSED:         { bg: '#FFF1F0', color: '#CF1322', border: 'rgba(255,77,79,0.3)', label: 'Paused' },
  REJECTED:       { bg: '#FFF1F0', color: '#CF1322', border: 'rgba(255,77,79,0.3)', label: 'Change Request' },
};

export default function StatusBadge({ status }) {
  const s = S[status] ?? { bg: '#F5F5F5', color: '#6B6B6B', border: 'rgba(0,0,0,0.08)', label: status };
  return (
    <span style={{
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`,
      borderRadius: 980,
      padding: '3px 10px',
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '-0.1px',
      whiteSpace: 'nowrap',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '120px',
      justifySelf: 'center',
    }}>
      {s.label}
    </span>
  );
}
