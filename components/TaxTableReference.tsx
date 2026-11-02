import taxTable from "../data/taxTable.json";
import { peso } from "../lib/money";

interface Bracket {
  over: number;
  notOver: number | null;
  rate: number;
  plus: number;
  excessOver: number | null;
}

function percent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

/**
 * Reference table for the graduated income tax rates on individuals (the rates a
 * sole proprietor uses under Graduated Tax). Data: data/taxTable.json. Display only:
 * it does not compute anyone's tax, and the 8% option is shown as a separate line.
 */
export default function TaxTableReference() {
  const brackets = taxTable as Bracket[];
  return (
    <section className="guide-stage tax-table-reference" aria-labelledby="tax-table-h">
      <h2 id="tax-table-h">Tax tables reference</h2>
      <p>
        These are the graduated income tax rates for individuals. A sole proprietor on the graduated rates pays the rate for the bracket
        their <strong>net taxable income</strong> falls in. Each bracket applies only to the amount above its lower limit.
      </p>

      <div className="tax-table-wrap">
        <table className="tax-table">
          <caption className="visually-hidden">Graduated income tax rates for individuals</caption>
          <thead>
            <tr>
              <th scope="col">Net taxable income</th>
              <th scope="col">Tax rate</th>
              <th scope="col">Plus tax of</th>
              <th scope="col">Applies to the amount over</th>
            </tr>
          </thead>
          <tbody>
            {brackets.map((b) => (
              <tr key={b.over}>
                <td>{b.notOver === null ? `Over ${peso(b.over)}` : b.over === 0 ? `${peso(0)} to ${peso(b.notOver)}` : `Over ${peso(b.over)} up to ${peso(b.notOver)}`}</td>
                <td>{b.rate === 0 ? "0% (exempt)" : percent(b.rate)}</td>
                <td>{peso(b.plus)}</td>
                <td>{b.excessOver === null ? "—" : peso(b.excessOver)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="hint">
        Example: net taxable income of ₱500,000 → ₱22,500 plus 20% of the amount over ₱400,000 = ₱22,500 + ₱20,000 = ₱42,500.
      </p>
      <p className="hint">
        The 8% option is a separate choice: 8% of gross sales or receipts above ₱250,000, instead of the graduated rates. It is generally for
        gross sales or receipts up to ₱3,000,000 and needs eligibility checks. Confirm the rates and your eligibility with the BIR or a tax
        professional before filing.
      </p>
    </section>
  );
}
