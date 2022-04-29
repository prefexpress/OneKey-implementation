import { WidgetPage } from '../pages/widget.page';
import { Cookies } from '@core/cookies';
import { getFakeIdentifier, getFakeIdentifiers, getFakePreferences } from '../../tests/helpers/cookies';
import { Identifiers } from '@core/model/generated-model';

describe('Welcome widget view', () => {
  let page: WidgetPage;

  context('without cookies', () => {
    before(() => {
      page = new WidgetPage();
      page.open();
    });

    it('should exist', () => {
      page.widget.findByText(/Manage your marketing preferences/).should('exist');
    });

    it('should have close button', () => {
      page.widget.findByText(/Close dialog/).should('exist');
    });

    it('should not have "Refresh ID" button', () => {
      page.refreshBtn.should('not.exist');
    });

    it('should not have selected consent option', () => {
      page.consentOptions.should('has.length', 2);
      page.consentOptions.each((option) => cy.wrap(option).shouldNotContainClass('active'));
    });

    it('should show/hide the Learn More panel', () => {
      const getPanel = () => page.widget.findByTestId('learn-more-header');

      getPanel().should('not.be.visible');
      page.logoBtn.click();
      getPanel().should('be.visible');
      page.widget.findByTestId('close-panel-btn').click();
      getPanel().should('not.be.visible');
    });
  });

  context('With cookies', () => {
    const FAKE_ID = 'FAKE-ID-PAF';
    const FAKE_ID_UID = 'FAKE-ID-UID';
    const consent = false;

    beforeEach(() => {
      // Let's put multiple ids
      cy.setCookie(
        Cookies.identifiers,
        JSON.stringify([getFakeIdentifier(FAKE_ID), getFakeIdentifier(FAKE_ID_UID, 'uid2')])
      );
      cy.setCookie(Cookies.preferences, JSON.stringify(getFakePreferences(consent)));
      cy.setCookie(Cookies.lastRefresh, new Date().toISOString());
      page = new WidgetPage();
      page.open();
    });

    it('should have cancel button', () => {
      page.widget.findByText(/Cancel/).should('exist');
    });

    it('should have "Refresh ID" button', () => {
      page.refreshBtn.should('exist');
    });

    it('should display a part of identifier', () => {
      page.refreshBtn.should('contain', FAKE_ID.split('-')[0]);
    });

    it('should call the "new id" endpoint', () => {
      cy.window().then((win) => {
        const NEW_ID = 'NEW-USER-ID';
        const response = {
          body: { identifiers: getFakeIdentifiers(NEW_ID) },
        };
        cy.intercept('GET', '/paf-proxy/v1/new-id', { body: response }).as('newId');
        page.refreshBtn.click();
        cy.waitFor('@newId');
        page.refreshBtn.should('contain', NEW_ID.split('-')[0]);
      });
    });

    it('should have selected consent option', () => {
      const selectedConsentIndex = consent ? 0 : 1;
      const oppositeOptionIndex = Math.abs(selectedConsentIndex - 1);
      page.consentOptions.eq(selectedConsentIndex).shouldContainClass('active');
      page.consentOptions.eq(oppositeOptionIndex).shouldNotContainClass('active');

      page.consentOptions.eq(oppositeOptionIndex).click();

      page.consentOptions.eq(selectedConsentIndex).shouldNotContainClass('active');
      page.consentOptions.eq(oppositeOptionIndex).shouldContainClass('active');

      page.consentOptions.eq(selectedConsentIndex).click();
    });

    it('should save preferences', () => {
      cy.window().then((win) => {
        const NEW_ID = 'NEW-USER-ID';
        const response = { body: { identifiers: getFakeIdentifiers(NEW_ID) } };
        cy.intercept('GET', '/paf-proxy/v1/new-id', { body: response }).as('newId');
        cy.intercept('POST', '/paf-proxy/v1/sign/prefs', { statusCode: 200 }).as('signIdsPrefs');
        cy.intercept('POST', '/paf-proxy/v1/sign/write', { statusCode: 200 }).as('writeIdsPrefs');
        const selectedConsentIndex = consent ? 0 : 1;
        const oppositeOptionIndex = Math.abs(selectedConsentIndex - 1);
        // Refresh ID
        page.refreshBtn.click();
        cy.waitFor('@newId');
        // Change preferences
        page.consentOptions.eq(oppositeOptionIndex).click();

        page.saveButton.click();
        const identifiers: Identifiers = [getFakeIdentifier(FAKE_ID_UID, 'uid2'), getFakeIdentifier(NEW_ID)];
        const unsignedPreferences = { version: '0.1', data: { use_browsing_for_personalization: true } };
        const request = JSON.stringify({ identifiers, unsignedPreferences });
        cy.waitFor('@signIdsPrefs');
        cy.waitFor('@writeIdsPrefs');
        cy.get('@signIdsPrefs').its('request.body').should('equal', request);
      });
    });
  });
});
