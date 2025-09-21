import angular from 'angular';

angular.module('taskforge').factory('BoardService', function (ApiService) {
  'ngInject';

  return {
    // Boards
    async getMyBoards() {
      const res = await ApiService.get('/api/boards');
      return res.data?.boards || [];
    },
    async createBoard(title) {
      const res = await ApiService.post('/api/boards', { title });
      return res.data?.board;
    },
    async deleteBoard(boardId) {
      const res = await ApiService.delete(`/api/boards/${boardId}`);
      return res.data;
    },
    async getBoard(boardId) {
      const res = await ApiService.get(`/api/boards/${boardId}`);
      return res.data?.board;
    },

    // Lists
    async getLists(boardId) {
      const res = await ApiService.get(`/api/boards/${boardId}/lists`);
      return res.data?.lists || [];
    },
    async createList(boardId, title) {
      const res = await ApiService.post(`/api/boards/${boardId}/lists`, { title });
      return res.data?.list;
    },
    async updateList(listId, data) {
      const res = await ApiService.patch(`/api/lists/${listId}`, data);
      return res.data?.list;
    },
    async deleteList(listId) {
      const res = await ApiService.delete(`/api/lists/${listId}`);
      return res.data;
    },

    // Cards
    async getCards(boardId) {
      const res = await ApiService.get(`/api/boards/${boardId}/cards`);
      return res.data?.cards || [];
    },
    async createCard(listId, data) {
      const res = await ApiService.post(`/api/lists/${listId}/cards`, data);
      return res.data?.card;
    },
    async updateCard(cardId, data) {
      const res = await ApiService.patch(`/api/cards/${cardId}`, data);
      return res.data?.card;
    },
    async moveCard(cardId, payload) {
      const res = await ApiService.patch(`/api/cards/${cardId}/move`, payload);
      return res.data?.card;
    },
    async deleteCard(cardId) {
      const res = await ApiService.delete(`/api/cards/${cardId}`);
      return res.data;
    },

    // Search
    async search(boardId, q) {
      const res = await ApiService.get(`/api/boards/${boardId}/search`, { params: { q } });
      return res.data?.results || [];
    }
  };
});