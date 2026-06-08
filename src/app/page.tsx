import { Calculator } from "./calculator";
import { getDeploymentMetadata, type DeploymentMetadata } from "./deployment";
import styles from "./page.module.css";

export default function Home() {
  const deployment = getDeploymentMetadata();

  return (
    <main className={styles.pageShell} aria-labelledby="page-title">
      <div className={styles.contentColumn}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Simple browser calculator</p>
          <h1 id="page-title">Web Calculator</h1>
          <p className={styles.intro}>
            Enter digits, decimals, and the four core arithmetic operations with
            the on-screen controls or your keyboard.
          </p>
        </section>
        {deployment ? <DeploymentDetails deployment={deployment} /> : null}
      </div>
      <Calculator />
    </main>
  );
}

function DeploymentDetails({
  deployment,
}: Readonly<{ deployment: DeploymentMetadata }>) {
  const sourceLabel = [deployment.ref, deployment.shortSha]
    .filter(Boolean)
    .join(" @ ");

  return (
    <aside
      className={styles.deploymentCard}
      aria-labelledby="deployment-title"
      data-deployment-target={deployment.target}
    >
      <p className={styles.deploymentEyebrow}>Cloudflare Workers</p>
      <h2 id="deployment-title">{deployment.targetLabel} deployment</h2>
      <dl className={styles.deploymentList}>
        <div className={styles.deploymentRow}>
          <dt>Environment</dt>
          <dd>{deployment.environment}</dd>
        </div>
        {deployment.url ? (
          <div className={styles.deploymentRow}>
            <dt>URL</dt>
            <dd>
              <a className={styles.deploymentLink} href={deployment.url}>
                {deployment.url}
              </a>
            </dd>
          </div>
        ) : null}
        {sourceLabel ? (
          <div className={styles.deploymentRow}>
            <dt>Source</dt>
            <dd>{sourceLabel}</dd>
          </div>
        ) : null}
      </dl>
    </aside>
  );
}
