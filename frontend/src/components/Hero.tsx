type Props = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  pills?: React.ReactNode;
};

export default function Hero({ title, subtitle, actions, pills }: Props) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-default p-8 md:p-12 hero-grad">
      <div className="max-w-2xl space-y-4">
        <h1 className="leading-tight">{title}</h1>
        {subtitle ? <p className="opacity-80">{subtitle}</p> : null}
        {actions ? <div className="mt-4">{actions}</div> : null}
        {pills ? <div className="mt-3 flex flex-wrap gap-2">{pills}</div> : null}
      </div>
    </section>
  );
}
