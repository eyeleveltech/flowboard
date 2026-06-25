const S = {
  IDEA:           { bg: '#F0F0F0', color: '#6B6B6B', border: 'rgba(0,0,0,0.08)', label: 'Idea' },
  DRAFT:          { bg: '#E8E8E8', color: '#3A3A3A', border: 'rgba(0,0,0,0.12)', label: 'Draft' },
  REVIEW:         { bg: '#D6D6D6', color: '#1A1A1A', border: 'rgba(0,0,0,0.16)', label: 'In Review' },
  APPROVED:       { bg: '#4A4A4A', color: '#FFFFFF', border: 'rgba(0,0,0,0)',    label: 'Approved' },
  CLIENT_APPROVED:{ bg: '#2C2C2C', color: '#FFFFFF', border: 'rgba(0,0,0,0)',    label: 'Client Approved' },
  SCHEDULED:      { bg: '#111111', color: '#FFFFFF', border: 'rgba(0,0,0,0)',    label: 'Scheduled' },
  PUBLISHED:      { bg: '#000000', color: '#FFFFFF', border: 'rgba(0,0,0,0)',    label: 'Published' },
  REJECTED:       { bg: '#F0F0F0', color: '#3A3A3A', border: 'rgba(0,0,0,0.2)', label: 'Changes Requested' },
};

export default function StatusBadge({ status }) {
  const s = S[status] ?? { bg: '#F0F0F0', color: '#6B6B6B', border: 'rgba(0,0,0,0.08)', label: status };
  return (
    <span style={{
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`,
      borderRadius: 980,
      padding: '2px 9px',
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '-0.1px',
      whiteSpace: 'nowrap',
      display: 'inline-block',
    }}>
      {s.label}
    </span>
  );
}
