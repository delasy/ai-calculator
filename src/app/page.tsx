import { Calculator } from "./calculator";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.pageShell} aria-labelledby="page-title">
      <section className={styles.hero}>
        <p className={styles.eyebrow}>Simple browser calculator</p>
        <h1 id="page-title">Web Calculator</h1>
        <p className={styles.intro}>
          Enter digits, decimals, and the four core arithmetic operations with
          the on-screen controls or your keyboard.
        </p>
      </section>
      <Calculator />
    </main>
  );
}
