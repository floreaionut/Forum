import I18n from "I18n";
import Controller from "@ember/controller";
import { Promise } from "rsvp";
import { inject } from "@ember/controller";
import { action } from "@ember/object";
import discourseComputed from "discourse-common/utils/decorators";
import Bookmark from "discourse/models/bookmark";

export default Controller.extend({
  application: inject(),
  user: inject(),

  content: null,
  loading: false,
  noResultsHelp: null,
  searchTerm: null,
  q: null,

  queryParams: ["q"],

  loadItems() {
    this.setProperties({
      content: [],
      loading: true,
      noResultsHelp: null
    });

    if (this.q && !this.searchTerm) {
      this.set("searchTerm", this.q);
    }

    return this.model
      .loadItems({ q: this.searchTerm })
      .then(response => this._processLoadResponse(response))
      .catch(() => this._bookmarksListDenied())
      .finally(() => {
        this.setProperties({
          loaded: true,
          loading: false
        });
      });
  },

  @discourseComputed("loaded", "content.length", "noResultsHelp")
  noContent(loaded, contentLength, noResultsHelp) {
    return loaded && contentLength === 0 && noResultsHelp;
  },

  @action
  search() {
    this.set("q", this.searchTerm);
    this.loadItems();
  },

  @action
  reload() {
    this.loadItems();
  },

  @action
  loadMore() {
    if (this.loadingMore) {
      return Promise.resolve();
    }

    this.set("loadingMore", true);

    return this.model
      .loadMore({ q: this.searchTerm })
      .then(response => this._processLoadResponse(response))
      .catch(() => this._bookmarksListDenied())
      .finally(() => this.set("loadingMore", false));
  },

  _bookmarksListDenied() {
    this.set("noResultsHelp", I18n.t("bookmarks.list_permission_denied"));
  },

  _processLoadResponse(response) {
    if (!response) {
      this._bookmarksListDenied();
      return;
    }

    if (response.no_results_help) {
      this.set("noResultsHelp", response.no_results_help);
      return;
    }

    response = response.user_bookmark_list;
    this.model.more_bookmarks_url = response.more_bookmarks_url;

    if (response.bookmarks) {
      this.content.pushObjects(
        response.bookmarks.map(bookmark => Bookmark.create(bookmark))
      );
    }
  }
});
