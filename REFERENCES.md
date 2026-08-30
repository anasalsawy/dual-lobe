# References and Prior Art

This bibliography distinguishes **agent-architecture prior art** from **neuroscience inspiration**. The cited neuroscience does not imply that the engineering modules are faithful neural simulations.

## A. AI agents, orchestration, and evaluation

1. **Anthropic. “Building effective agents.”** 2024.  
   Evaluator–optimizer, orchestrator–worker and other composable agent patterns.  
   https://www.anthropic.com/engineering/building-effective-agents

2. **Shi, Z. et al. “Learning to Use Tools via Cooperative and Interactive Agents.”** arXiv:2403.03031, 2024.  
   Introduces ConAgents, separating tool selection, execution and calibration across cooperating specialized agents.  
   https://arxiv.org/abs/2403.03031

3. **Zhang, K. et al. “Tool-RoCo: An Agent-as-Tool Self-organization Large Language Model Benchmark in Multi-robot Cooperation.”** arXiv:2511.21510, 2025.  
   Evaluates multiple paradigms of LLM cooperation and reports low spontaneous use of cooperative tools in tested settings.  
   https://arxiv.org/abs/2511.21510

4. **Anthropic. “Demystifying evals for AI agents.”** 2026.  
   Practical guidance for multi-turn, tool-using agent evaluation and eval-driven development.  
   https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents

5. **Anthropic. “Writing effective tools for AI agents—using AI agents.”** 2025.  
   Tool interfaces, evaluation and agent-computer-interface design.  
   https://www.anthropic.com/engineering/writing-tools-for-agents

## B. Interhemispheric communication and specialization

6. **van der Knaap, L.J., van der Ham, I.J.M. “How does the corpus callosum mediate interhemispheric transfer? A review.”** *Behavioural Brain Research* 223(1), 211–221, 2011.  
   DOI: 10.1016/j.bbr.2011.04.018

7. **Bloom, J.S., Hynd, G.W. “The role of the corpus callosum in interhemispheric transfer of information: excitation or inhibition?”** *Neuropsychology Review*, 2005.  
   PubMed: https://pubmed.ncbi.nlm.nih.gov/16211466/

8. **Cross-hemispheric communication: Insights on lateralized brain functions.** *Trends in Neurosciences*, 2024.  
   PubMed: https://pubmed.ncbi.nlm.nih.gov/38458199/

**Design use:** motivates studying constrained information exchange between specialized processors. It does **not** justify assigning planning to one literal cerebral hemisphere and execution to the other.

## C. Attention and thalamic control

9. **Halassa, M.M., Kastner, S. “Thalamic functions in distributed cognitive control.”** *Nature Neuroscience* 20, 1669–1679, 2017.  
   DOI: 10.1038/s41593-017-0020-1  
   PubMed: https://pubmed.ncbi.nlm.nih.gov/29184210/

10. **Nakajima, M., Halassa, M.M. “Thalamic control of functional cortical connectivity.”** *Current Opinion in Neurobiology* 44, 127–131, 2017.  
    DOI: 10.1016/j.conb.2017.04.001

**Design use:** inspiration for a context-admission/control layer that shapes which distributed computations are active.

## D. Predictive coding and surprise

11. **Friston, K., Kiebel, S. “Predictive coding under the free-energy principle.”** *Philosophical Transactions of the Royal Society B* 364, 1211–1221, 2009.  
    DOI: 10.1098/rstb.2008.0300  
    PubMed: https://pubmed.ncbi.nlm.nih.gov/19528002/

12. **Friston, K. “The free-energy principle: a unified brain theory?”** *Nature Reviews Neuroscience* 11, 127–138, 2010.  
    DOI: 10.1038/nrn2787  
    PubMed: https://pubmed.ncbi.nlm.nih.gov/20068583/

13. **Spratling, M.W. “A review of predictive coding algorithms.”** *Brain and Cognition* 112, 92–97, 2017.  
    DOI: 10.1016/j.bandc.2015.11.003

**Design use:** motivates explicitly recording expected outcomes and elevating large prediction errors as recovery signals.

## E. Replay and memory consolidation

14. **Carr, M.F., Jadhav, S.P., Frank, L.M. “Hippocampal replay in the awake state: a potential substrate for memory consolidation and retrieval.”** *Nature Neuroscience* 14, 147–153, 2011.  
    DOI: 10.1038/nn.2732  
    PubMed: https://pubmed.ncbi.nlm.nih.gov/21270783/

15. **Joo, H.R., Frank, L.M. “The hippocampal sharp wave–ripple in memory retrieval for immediate use and consolidation.”** *Nature Reviews Neuroscience* 19, 744–757, 2018.  
    DOI: 10.1038/s41583-018-0077-1

**Design use:** inspiration for offline replay of difficult/high-surprise traces to distill candidate durable lessons.

## F. Action selection

16. **Redgrave, P., Prescott, T.J., Gurney, K. “The basal ganglia: a vertebrate solution to the selection problem?”** *Neuroscience* 89(4), 1009–1023, 1999.  
    DOI: 10.1016/S0306-4522(98)00319-4  
    PubMed: https://pubmed.ncbi.nlm.nih.gov/10362291/

**Design use:** inspiration for explicit GO / NOGO / HOLD arbitration among competing actions.

## G. Global workspace

17. **Dehaene, S., Naccache, L. “Towards a cognitive neuroscience of consciousness: basic evidence and a workspace framework.”** *Cognition* 79, 1–37, 2001.  
    DOI: 10.1016/S0010-0277(00)00123-2  
    PubMed: https://pubmed.ncbi.nlm.nih.gov/11164022/

18. **Mashour, G.A., Roelfsema, P., Changeux, J.-P., Dehaene, S. “Conscious Processing and the Global Neuronal Workspace Hypothesis.”** *Neuron* 105(5), 776–798, 2020.  
    DOI: 10.1016/j.neuron.2020.01.026  
    PubMed: https://pubmed.ncbi.nlm.nih.gov/32135090/

**Design use:** inspiration for a bounded broadcast surface through which selected information becomes globally available to modules. The architecture makes no claim about machine consciousness.

## H. Working-memory capacity

19. **Cowan, N. “The magical number 4 in short-term memory: a reconsideration of mental storage capacity.”** *Behavioral and Brain Sciences* 24(1), 87–114, 2001.  
    DOI: 10.1017/S0140525X01003922  
    PubMed: https://pubmed.ncbi.nlm.nih.gov/11515286/

**Design use:** motivates testing small explicit working-memory buffers. The engineering slot count is tunable and is not asserted to equal human capacity.

## Citation principle

Use these sources to justify **questions and analogies**, not to imply that an LLM architecture reproduces the corresponding biological structure. Any empirical claim about Dual-Lobe itself requires direct agent-evaluation results.
