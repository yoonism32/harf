// Deliberately authored examples; morphology labels alone do not interpret a sentence.
export const languagePatterns = [
 {id: 'suffix', reference: '1:7', wordKey: '1:7:4', title: 'A pronoun attached to a preposition',
  explanation: 'In عَلَيْهِمْ, عَلَى means “upon” and the attached هِمْ refers to “them”. Here it points back to those who received favour. Read the whole ayah to identify who a pronoun refers to.', evidence: ['SUFFIX', 'PRON:3MP']},
 {id: 'connector', reference: '1:5', wordKey: '1:5:3', title: 'The connector وَ',
  explanation: 'The وَ at the beginning of وَإِيَّاكَ joins the two clauses: worshipping You and asking You for help. Here it means “and”; it does not by itself tell you a sequence in time.', evidence: ['w:CONJ+']},
 {id: 'verb', reference: '1:5', wordKey: '1:5:2', title: 'Recognising “we” in a verb',
  explanation: 'نَعْبُدُ means “we worship” here. The source analysis labels it an imperfect verb in the first-person plural. Notice that “we” is carried in the verb form, without a separate نحن in this clause.', evidence: ['IMPF', '1P']},
 {id: 'negation', reference: '112:3', wordKey: '112:3:1', title: 'Negation with لَمْ',
  explanation: 'لَمْ negates the following verb. In this ayah it precedes يَلِدْ, and the pattern repeats in وَلَمْ يُولَدْ. Compare the sourced translation of both clauses; the second verb is passive.', evidence: ['POS:NEG']},
] as const;
