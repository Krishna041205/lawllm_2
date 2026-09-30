export interface SampleContractPreset {
  id: string;
  name: string;
  category: "contract" | "case_law";
  type: "docx" | "pdf" | "txt";
  description: string;
  riskHint: string;
  content: string;
}

export const SAMPLE_PRESETS: SampleContractPreset[] = [
  {
    id: "sample-msa-apex",
    name: "Enterprise Cloud MSA (ApexCloud)",
    category: "contract",
    type: "docx",
    description: "Multi-year SaaS agreement with severe one-sided indemnification, 1-month liability cap for vendor, and unlimited customer liability.",
    riskHint: "Critical Risk (88/100)",
    content: `MASTER SERVICES AGREEMENT (MSA)
This Master Services Agreement ("Agreement") is made and entered into as of January 15, 2025 ("Effective Date"), by and between ApexCloud Solutions Inc., a Delaware corporation ("Provider"), and Vertex Financial Global LLC ("Customer").

1. SERVICES AND DELIVERABLES
Provider agrees to deliver enterprise multi-tenant cloud hosting, API integrations, and continuous security infrastructure monitoring as detailed in Statements of Work ("SOW").

2. PAYMENT AND FEES
Customer agrees to pay all invoiced amounts within fifteen (15) days of invoice receipt. Overdue amounts accrue interest at 2.5% per month or the maximum statutory rate allowed. Provider reserves the right to suspend all access to Customer data and production APIs immediately upon 3 business days of non-payment without liability.

3. INTELLECTUAL PROPERTY RIGHTS
Provider retains all right, title, and interest in and to the Platform, underlying algorithms, and custom modifications. Customer assigns to Provider all rights in any derivative works, feedback, custom integration workflows, and Customer-requested tailored feature enhancements developed under any SOW. Customer grants Provider an irrevocable, perpetual, royalty-free license to use Customer's confidential data and transaction metadata to train Provider's proprietary machine learning models.

4. INDEMNIFICATION
Customer shall defend, indemnify, and hold harmless Provider, its officers, directors, and affiliates from and against any and all claims, damages, liabilities, costs, and expenses (including attorneys' fees) arising out of or related to (a) Customer's use of the Services; (b) any alleged infringement of third-party IP rights by Customer data; or (c) Customer breach of this Agreement. Provider offers NO reciprocal indemnity for Provider's infringement of third-party intellectual property or platform data breaches.

5. LIMITATION OF LIABILITY
TO THE MAXIMUM EXTENT PERMITTED BY LAW, PROVIDER'S TOTAL AGGREGATE LIABILITY ARISING OUT OF OR RELATED TO THIS AGREEMENT, WHETHER IN CONTRACT, TORT, OR OTHERWISE, SHALL NOT EXCEED THE TOTAL AMOUNT ACTUALLY PAID BY CUSTOMER IN THE ONE (1) MONTH PRECEDING THE CLAIM. IN NO EVENT SHALL PROVIDER BE LIABLE FOR ANY CONSEQUENTIAL, INCIDENTAL, PUNITIVE, SPECIAL, OR LOST PROFIT DAMAGES. CUSTOMER'S LIABILITY UNDER THIS AGREEMENT SHALL BE COMPLETELY UNLIMITED.

6. TERM AND TERMINATION
This Agreement commences on the Effective Date and continues for an initial fixed term of three (3) years. The Agreement automatically renews for successive 2-year periods unless Customer provides written notice of non-renewal at least one hundred and twenty (120) days prior to expiration. Customer may not terminate for convenience. Provider may terminate immediately with 5 days notice for convenience or immediately upon suspected breach.

7. CONFIDENTIALITY AND NON-SOLICITATION
During the term and for a period of ten (10) years thereafter, Customer shall not solicit, hire, or engage any employee or contractor of Provider. Customer acknowledges that breach of this provision warrants liquidated damages of $250,000 per employee.

8. GOVERNING LAW AND ARBITRATION
This Agreement shall be governed by the laws of the State of Delaware without regard to conflict of law principles. Any dispute shall be resolved through binding private arbitration in Wilmington, Delaware, with each party bearing their own expenses, provided that Provider may seek immediate injunctive relief in any court of competent jurisdiction.`
  },
  {
    id: "sample-nda-mutual",
    name: "Mutual NDA with Aggressive Non-Compete & IP Lock",
    category: "contract",
    type: "pdf",
    description: "Bilateral confidentiality agreement secretly embedding a 5-year nationwide non-compete clause and unilateral IP assignment.",
    riskHint: "High Risk (74/100)",
    content: `MUTUAL NON-DISCLOSURE AND RESTRICTIVE COVENANTS AGREEMENT
This Agreement is entered into on March 4, 2025 between NovaTech Ventures Inc. ("Disclosing Party") and Alpha Capital Partners ("Recipient").

1. PURPOSE
The parties wish to explore a potential strategic business collaboration and technology co-development opportunity ("Transaction").

2. CONFIDENTIAL INFORMATION
"Confidential Information" includes all financial data, source code, algorithmic architectures, customer lists, and business strategies disclosed directly or indirectly. The standard 14-day post-meeting written confirmation requirement is waived; any oral discussions in hallway or virtual rooms are permanently deemed Confidential Information.

3. EXCLUSIONS FROM CONFIDENTIALITY
Information is not Confidential Information if it was already known to Recipient prior to disclosure, provided Recipient produces written evidentiary logs executed by an external notary within 48 hours of original creation.

4. NON-COMPETITION AND NON-CIRCUMVENTION
In consideration of receiving Confidential Information, Recipient agrees that for a period of five (5) years following termination of discussions, Recipient shall not develop, market, invest in, or consult for any business, product, or software application operating within the enterprise artificial intelligence, fintech, or predictive analytics sectors in North America or Europe.

5. INTELLECTUAL PROPERTY ASSIGNMENT
Any improvements, modifications, feedback, patent ideas, or architectural blueprints conceived by Recipient that relate in any manner to Disclosing Party's Confidential Information shall become the sole and exclusive property of Disclosing Party without additional consideration.

6. INJUNCTIVE RELIEF AND LIQUIDATED DAMAGES
In the event of any breach or threatened breach by Recipient, Disclosing Party shall be entitled to an immediate ex parte preliminary injunction without the necessity of posting any bond or proving monetary damages, plus stipulated liquidated damages of $500,000 per breach event.

7. GOVERNING LAW & VENUE
Governing law shall be the laws of the State of Texas. Venue shall lie exclusively in Travis County, Austin, Texas.`
  },
  {
    id: "sample-case-apex-meridian",
    name: "Apex Tech Corp v. Meridian Logistics (2d Cir. 2024)",
    category: "case_law",
    type: "pdf",
    description: "Second Circuit Federal Appellate decision on Trade Secret specificity pleading standard (DTSA) and oral NDA disclosures.",
    riskHint: "Precedent Judgment",
    content: `UNITED STATES COURT OF APPEALS FOR THE SECOND CIRCUIT
Docket No. 23-1892-cv
APEX TECHNOLOGIES CORP., Plaintiff-Appellant,
v.
MERIDIAN LOGISTICS INC., Defendant-Appellee.

Decided: October 18, 2024
Before: LEVAL, CABRANES, and CHIN, Circuit Judges.

SUMMARY ORDER & OPINION:
1. PROCEDURAL FACTS & BACKGROUND
Plaintiff Apex Technologies Corp. brought suit against Meridian Logistics Inc. alleging misappropriation of trade secrets under the Defend Trade Secrets Act (DTSA), 18 U.S.C. § 1836, and breach of a bilateral Mutual Non-Disclosure Agreement executed in March 2022. Apex asserted that during exploratory merger talks, Meridian accessed proprietary algorithmic supply-chain routing code and subsequently incorporated key architecture into its autonomous dispatch software 'MeridianCore'.

2. DISTRICT COURT FINDINGS
The District Court for the Southern District of New York (SDNY) granted summary judgment in favor of Meridian, holding that Apex failed to identify the trade secrets with sufficient specificity under DTSA and that the NDA's definition of 'Confidential Information' excluded items disclosed during informal whiteboard sessions without written post-meeting marking within 14 days.

3. LEGAL ISSUES ON APPEAL
Issue 1: Did the district court err in applying a strict post-meeting written designation requirement where oral presentations were accompanied by proprietary source-code demonstrations?
Issue 2: Does the standard set forth in Federal Trade Secret Jurisprudence (Oakwood Labs LLC v. Thanoo, 999 F.3d 892 (3d Cir. 2021)) require line-by-line code disclosure at the pleading/summary judgment stage?

4. HOLDING AND RATIO DECIDENDI
VACATED AND REMANDED. The Second Circuit held that the district court erred by demanding exhaustive code granularity at summary judgment where circumstantial evidence demonstrated substantial architectural similarity and sudden accelerated development by Meridian.
Citing Oakwood Labs LLC v. Thanoo, 999 F.3d 892 (3d Cir. 2021) and InteliClear LLC v. ETC Global Holdings, Inc., 978 F.3d 653 (9th Cir. 2020), this Court holds that identifying trade secrets by functional technical modules combined with evidence of unauthorized access is sufficient to create a genuine triable issue of material fact.

5. PRECEDENT AUTHORITIES CITED
- Oakwood Labs LLC v. Thanoo, 999 F.3d 892 (3d Cir. 2021) [Applied: pleading standards for trade secret misappropriation]
- InteliClear LLC v. ETC Global Holdings, Inc., 978 F.3d 653 (9th Cir. 2020) [Applied: sufficiency of technical functional descriptions]
- Restatement (Third) of Unfair Competition § 39 (1995)
- Defend Trade Secrets Act of 2016, 18 U.S.C. §§ 1836-1839.`
  },
  {
    id: "sample-employment-exec",
    name: "Executive Employment Agreement (VP Engineering)",
    category: "contract",
    type: "docx",
    description: "C-level executive employment contract with missing severance protections, ambiguous clawback trigger, and restrictive invention assignments.",
    riskHint: "Moderate Risk (58/100)",
    content: `EXECUTIVE EMPLOYMENT AGREEMENT
This Executive Employment Agreement ("Agreement") is entered into as of February 1, 2025, between Quantum Systems Global Inc. ("Company") and Jane Doe ("Executive").

1. POSITION AND DUTIES
Executive shall serve as Vice President of Engineering, reporting to the Chief Technology Officer. Executive agrees to devote 100% of their business time, attention, and energies exclusively to Company operations.

2. COMPENSATION & BONUS
Base salary shall be $280,000 annually. Annual performance bonus up to 40% of Base Salary shall be determined at the sole, unreviewable discretion of the Board of Directors. Any bonus paid within the prior 24 months is subject to immediate clawback if Company restates financial statements for any reason.

3. INVENTIONS AND INTELLECTUAL PROPERTY
Executive assigns to Company all inventions, discoveries, designs, and computer code authored or developed by Executive during the period of employment, whether developed on Company equipment or personal devices during weekends, unless Executive proves that the invention has zero relation to present or anticipated future Company business lines.

4. TERMINATION
(a) At-Will: Employment is at-will. Company may terminate Executive without cause upon 14 days written notice.
(b) Severance: In the event of termination without Cause, Executive is entitled to two (2) weeks of base salary, contingent upon signing a general release of all claims. No accelerated equity vesting shall occur upon a Change in Control.

5. POST-EMPLOYMENT RESTRICTIONS
For twenty-four (24) months following termination of employment, Executive shall not directly or indirectly provide technical or managerial services to any company developing distributed database infrastructure or quantum algorithms worldwide.`
  }
];
