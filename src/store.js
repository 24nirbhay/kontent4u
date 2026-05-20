import { create } from 'zustand';

const useAppStore = create((set) => ({
	activeTab: 'The Arena',
	setActiveTab: (tab) => set({ activeTab: tab }),

	targetAudienceProfile: '',
	setTargetAudienceProfile: (profile) => set({ targetAudienceProfile: profile }),

	scrapedTrendsCache: [],
	setScrapedTrendsCache: (trends) => set({ scrapedTrendsCache: trends }),

	arenaAgentTurnState: 0,
	setArenaAgentTurnState: (turn) => set({ arenaAgentTurnState: turn }),

	finalGeneratedScript: '',
	setFinalGeneratedScript: (script) => set({ finalGeneratedScript: script }),

	// Auth modal control for lightweight redirect-to-login UX
	showAuth: false,
	openAuth: () => set({ showAuth: true }),
	closeAuth: () => set({ showAuth: false }),

	resetWorkspace: () => set({ targetAudienceProfile: '', scrapedTrendsCache: [], arenaAgentTurnState: 0, finalGeneratedScript: '' })
}));

export default useAppStore;
