import React from 'react';

export default function StatCard({
  label,
  value,
  icon: Icon,
  variant = 'default',
  trend,
  trendPositive,
  sublabel
}) {
  return (
    <div className={`stat-card ${variant}`}>
      <div className="stat-card-header">
        <span className="stat-label">{label}</span>
        {Icon && (
          <div className="stat-icon-wrap">
            <Icon size={18} />
          </div>
        )}
      </div>

      <div className="stat-value">{value}</div>

      {(sublabel || trend) && (
        <div className="stat-footer">
          {trend && (
            <span style={{ color: trendPositive ? 'var(--cyber-emerald)' : 'var(--cyber-rose)', fontWeight: 600 }}>
              {trend}
            </span>
          )}
          {sublabel && <span>{sublabel}</span>}
        </div>
      )}
    </div>
  );
}
