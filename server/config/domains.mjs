// Publisher classification used to assign a default credibility tier to news.
// This is a starting point, not a verdict: individual claims are still tiered
// editorially in data/curated. Edit freely; unknown domains fall back to `media`.
export const DOMAIN_TYPES = {
  official: [
    'rospotrebnadzor.ru', 'government.ru', 'kremlin.ru', 'irkobl.ru', 'minzdrav.gov.ru', 'mid.ru',
    'state.gov', 'usembassy.gov', 'cdc.gov', 'gov.kz', 'gov.uz', 'gov.kg', 'nhc.gov.cn', 'mfa.gov.cn',
  ],
  intl: ['who.int', 'un.org', 'ecdc.europa.eu', 'europa.eu', 'woah.org'],
  wire: ['reuters.com', 'apnews.com', 'afp.com', 'bloomberg.com', 'interfax.ru', 'xinhuanet.com', 'news.cn'],
  state_media: [
    'tass.ru', 'tass.com', 'ria.ru', 'rt.com', 'iz.ru', 'rg.ru', 'ren.tv', 'vesti.ru', '1tv.ru', 'tvzvezda.ru',
    'lenta.ru', 'news.ru', 'life.ru', 'cgtn.com', 'globaltimes.cn', 'chinadaily.com.cn', 'people.com.cn',
    'cctv.com', 'chinanews.com.cn', 'gmw.cn', 'nsn.fm', 'aif.ru', 'kp.ru', 'mk.ru',
  ],
  media: [
    'meduza.io', 'themoscowtimes.com', 'novayagazeta.ru', 'theins.ru', 'bbc.com', 'bbc.co.uk', 'dw.com', 'cnn.com',
    'nbcnews.com', 'cbsnews.com', 'abcnews.go.com', 'nytimes.com', 'washingtonpost.com', 'theguardian.com',
    'cnbc.com', 'forbes.com', 'forbes.ru', 'euronews.com', 'france24.com', 'lemonde.fr', 'politico.eu', 'aljazeera.com',
    'theatlantic.com', 'newsweek.com', 'independent.co.uk', 'svoboda.org', 'rbc.ru', 'kommersant.ru', 'fontanka.ru',
    'tvrain.tv', 'zona.media', 'medvestnik.ru', 'rfi.fr', 'npr.org', 'pbs.org', 'sky.com', 'news.sky.com', 'abc.net.au',
    'rtvi.com', 'statnews.com', 'science.org', 'nature.com', 'healthbeat.org', 'cidrap.umn.edu', 'thelancet.com',
    'lshtm.ac.uk', 'atlanticcouncil.org', 'timesca.com', 'kun.uz', 'caixin.com', 'thepaper.cn', 'zaobao.com',
  ],
  // Outlets with a documented record of sensational or unsourced health claims,
  // anonymous Telegram aggregators and video platforms. Shown, but flagged.
  caution: [
    'epochtimes.com', 'ntdtv.com', 'secretchina.com', 'youtube.com', 't.me', 'my.ua', 'tsn.ua', '24tv.ua',
    'focus.ua', 'dialog.ua', 'wenxuecity.com', 'secretchina.com', 'aboluowang.com', 'kanzhongguo.com', 'soundofhope.org', 'ua.news', 'unian.net', 'obozrevatel.com', 'pravda.ru', 'tsargrad.tv', 'dzen.ru', 'vk.com',
  ],
};

export const SOURCE_TYPE_TIER = {
  official: 'confirmed',
  intl: 'confirmed',
  wire: 'reported',
  state_media: 'reported',
  media: 'reported',
  caution: 'unverified',
};
