# AI Training System: Deep Review & Evolution Plan

## 1. Deep Review of Current System

### 1.1 Architecture Analysis
The current AI system is built on a solid "Dual-Brain" architecture:
- **Left Brain (MCTS)**: Handles logical calculations, win-rate simulation, and strategic search. It supports Team Play (cooperation) and individual strategies.
- **Right Brain (LLM)**: Handles personality, role-playing, and "human-like" decision making (reducing machine-like rigidness).
- **Data Collection**: `MasterDataCollector` is well-implemented to capture detailed game states, decisions, and outcomes into JSONL format suitable for LLM fine-tuning.

### 1.2 Strengths
- **Robustness**: The separation of Logic (MCTS) and Intuition (LLM) ensures the AI makes legal and generally strong moves even if the LLM hallucinates or fails.
- **Flexibility**: The `HybridStrategy` dynamically balances between MCTS reliability and LLM creativity.
- **Team Awareness**: Recent updates added specific logic for 3v3 and 2v2 team structures (odd/even pairing).

### 1.3 Identified Gaps
1.  **Lack of Automated Training Loop**: Currently, there is no "Gym" or "Arena" to automatically run thousands of games to optimize MCTS parameters (e.g., `cooperationWeight`, `explorationConstant`). Tuning is likely manual or heuristic-based.
2.  **Generic Team Configuration**: The system treats all team modes (2v2, 3v3) with a single `teamMode` configuration. 3v3 (6 players) is significantly more complex than 2v2 (4 players) and likely requires different weightings for "holding big cards" vs "passing to teammates".
3.  **Response Latency**: While optimized, the hybrid approach (especially LLM) can introduce latency. The UI needs to better manage this "thinking state" to keep the game feeling responsive.

---

## 2. Evolution Plan

### Phase 1: Interactive Training Environment (The "Arena")
**Objective**: Adapt to Individual, Team 2v2, and Team 3v3 rules via self-play optimization.

- **Action**: Create a `SimulatedTrainingEnv` that can run headless games at high speed.
- **Feature**:
    - Support configuring Game Mode (Individual, 2v2, 3v3).
    - Run `N` batches of games (e.g., 100 games).
    - Output statistics: Win Rates per Role/Team, Average Round Length, "Mistake" frequency (illegal moves caught).
- **Integration**: Add a verified "Training Dashboard" to the DevTools or Settings in the App to trigger these sessions and auto-update `AIConfigStore`.

### Phase 2: Targeted Strategy Optimization
**Objective**: "Smartest" strategies for specific modes.

- **Action**: Implement "Parameter Grid Search" in the Training Environment.
- **Logic**:
    - For **3v3**: Test higher `cooperationWeight` (sacrificing self for team) and `roleWeight` (Carry vs Support logic).
    - For **Individual**: Maximize `selfish` parameters.
- **Deliverable**: Update `AIConfigStore` to save distinct profiles for `config_team_4p` vs `config_team_6p`.

### Phase 3: Response UI Optimization
**Objective**: Make the AI feel intelligent and responsive.

- **Action**:
    - **Visual Thinking Indicator**: Show *what* the AI is considering (e.g., "Thinking... Considering passing to partner" or "Calculating win rate...").
    - **Instant Feedback**: When AI plays, highlight *why* (e.g., small icon for "Defensive Play" or "Aggressive Attack").
    - **Latency Hiding**: optimizing the pre-calculation during other players' turns.

---

## 3. Immediate Execution Steps

1.  **Refactor Config**: Split `AIConfigStore` to support `playerCount` specific configurations (4p vs 6p).
2.  **Build Arena**: Implement `GameArena.ts` to run simulations.
3.  **UI Update**: Add a "Thinking" state visualization to `GameBoard.vue`.
