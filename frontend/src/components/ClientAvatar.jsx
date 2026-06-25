export default function ClientAvatar({ client, size = 32 }) {
  const initials = client.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: size,
      height: size,
      borderRadius: size * 0.28,
      background: '#EBEBEB',
      border: '1px solid rgba(0,0,0,0.1)',
      color: '#3A3A3A',
      fontWeight: 700,
      fontSize: size * 0.38,
      letterSpacing: '-0.5px',
      flexShrink: 0,
    }}>
      {client.logoUrl ? (
        <img src={client.logoUrl} alt={client.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
      ) : initials}
    </span>
  );
}
