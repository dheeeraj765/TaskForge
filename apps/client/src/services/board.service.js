// apps/client/src/services/board.service.js
import angular from 'angular';

angular.module('taskforge').factory('BoardService', function (ApiService) {
  'ngInject';

  const asItem = (x) => (x ? { ...x, id: x.id || x._id } : x);

  // Helpers to handle both wrapped and plain shapes from the API
  const arr = (d) => Array.isArray(d)
    ? d
    : (Array.isArray(d?.lists) ? d.lists
    : (Array.isArray(d?.cards) ? d.cards
    : (Array.isArray(d?.results) ? d.results : [])));

  const obj = (d) => (d && (d.list || d.card || d.board || d)) || d;

  return {
    // Boards
    async getMyBoards() {
      const res = await ApiService.get('/boards');          // -> [ ... ]
      return arr(res.data).map(asItem);
    },

    async createBoard(title) {
      const res = await ApiService.post('/boards', { title, name: title }); // -> board or { board }
      return asItem(obj(res.data));
    },

    async deleteBoard(boardId) {
      await ApiService.delete(`/boards/${boardId}`);
      return true;
    },

    async getBoard(boardId) {
      const res = await ApiService.get(`/boards/${boardId}`); // -> board or { board }
      return asItem(obj(res.data));
    },

    // Lists
    async getLists(boardId) {
      const res = await ApiService.get(`/boards/${boardId}/lists`); // -> { lists: [...] }
      return arr(res.data).map(asItem);
    },

    async createList(boardId, title) {
      const res = await ApiService.post(`/boards/${boardId}/lists`, { title, name: title }); // -> { list: {...} }
      return asItem(obj(res.data));
    },

    async updateList(listId, data) {
      const res = await ApiService.patch(`/lists/${listId}`, data); // -> { list: {...} } or list
      return asItem(obj(res.data));
    },

    async deleteList(listId) {
      await ApiService.delete(`/lists/${listId}`);
      return true;
    },

    // Cards
    async getCards(boardId) {
      const res = await ApiService.get(`/boards/${boardId}/cards`); // -> { cards: [...] } or [ ... ]
      return arr(res.data).map(asItem);
    },

    async createCard(listId, data) {
      const res = await ApiService.post(`/lists/${listId}/cards`, data); // -> { card: {...} } or card
      return asItem(obj(res.data));
    },

    async updateCard(cardId, data) {
      const res = await ApiService.patch(`/cards/${cardId}`, data); // -> { card: {...} } or card
      return asItem(obj(res.data));
    },

    async moveCard(cardId, payload) {
      const res = await ApiService.patch(`/cards/${cardId}/move`, payload); // -> { card: {...} } or card
      return asItem(obj(res.data));
    },

    async deleteCard(cardId) {
      await ApiService.delete(`/cards/${cardId}`);
      return true;
    },

    // Search
    async search(boardId, q) {
      const res = await ApiService.get(`/boards/${boardId}/search`, { params: { q } }); // -> { results: [...] } or [ ... ]
      return arr(res.data).map(asItem);
    }
  };
});