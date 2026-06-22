(function (global) {
  'use strict';

  function text(value) {
    return value == null ? '' : String(value).trim();
  }

  function number(value, fallback) {
    var parsed = parseInt(value, 10);
    return isNaN(parsed) ? (fallback || 0) : parsed;
  }

  function normalize(value) {
    return text(value).replace(/\s+/g, ' ').toLowerCase();
  }

  function isEngItemId(value) {
    return /^[0-9A-F]{24,64}$/i.test(text(value));
  }

  function isPrdId(value) {
    return /^prd-[A-Za-z0-9_-]+$/i.test(text(value));
  }

  function membersOf(response) {
    if (global.EnoviaApi && typeof global.EnoviaApi.extractMembers === 'function') {
      return global.EnoviaApi.extractMembers(response);
    }
    if (response && Array.isArray(response.member)) return response.member;
    if (Array.isArray(response)) return response;
    return [];
  }

  function objectValue(object, keys) {
    if (!object || typeof object !== 'object') return '';
    for (var i = 0; i < keys.length; i++) {
      var value = object[keys[i]];
      if (value != null && value !== '') return text(value);
    }
    return '';
  }

  function normalizeMember(member) {
    return {
      id: objectValue(member, ['id', 'physicalid', 'physicalId']),
      name: objectValue(member, ['name']),
      title: objectValue(member, ['title', 'label', 'displayName', 'name']),
      type: objectValue(member, ['type', 'displayType']),
      childCount: number(objectValue(member, ['childCount', 'childrenCount', 'numberOfChildren', 'children']), 0)
    };
  }

  function firstMember(response) {
    var members = membersOf(response);
    if (members.length) return members[0];
    if (response && response.member && !Array.isArray(response.member)) return response.member;
    return response || {};
  }

  function scoreCandidate(member, detectedObject) {
    var candidate = normalizeMember(member);
    var score = 0;
    var detectedId = text(detectedObject && detectedObject.id);
    var detectedName = text(detectedObject && detectedObject.name);
    var detectedTitle = text(detectedObject && detectedObject.title);
    var ids = [candidate.id];
    var names = [candidate.name, candidate.title];
    if (detectedId && ids.indexOf(detectedId) >= 0) score += 1000;
    if (detectedId && names.indexOf(detectedId) >= 0) score += 600;
    if (detectedName && names.indexOf(detectedName) >= 0) score += 340;
    if (detectedTitle && names.indexOf(detectedTitle) >= 0) score += 320;
    if (detectedName && normalize(candidate.name) === normalize(detectedName)) score += 140;
    if (detectedTitle && normalize(candidate.title) === normalize(detectedTitle)) score += 120;
    if (detectedId && isPrdId(detectedId) && candidate.name === detectedId) score += 220;
    if (isEngItemId(candidate.id)) score += 40;
    if (/EngItem|Reference/i.test(candidate.type)) score += 10;
    return score;
  }

  function estimateDepth(expectedChildCount, detectedDepth) {
    var explicit = number(detectedDepth, 0);
    if (explicit > 0) return Math.max(1, Math.min(explicit, 3));
    var expected = number(expectedChildCount, 0);
    if (expected >= 80) return 3;
    if (expected >= 20) return 2;
    return 1;
  }

  function buildResolved(member, strategy, detectedObject, expectedHint) {
    member = normalizeMember(member);
    var expectedChildCount = Math.max(member.childCount || 0, number(expectedHint, 0), number(detectedObject && detectedObject.expectedCount, 0));
    return {
      ok: true,
      rootEngItemId: member.id,
      rootInstanceId: isPrdId(detectedObject && detectedObject.id) ? text(detectedObject.id) : text(detectedObject && detectedObject.instanceId),
      expectedChildCount: expectedChildCount,
      detectedDepth: estimateDepth(expectedChildCount, detectedObject && detectedObject.detectedDepth),
      resolverStrategy: strategy,
      title: member.title || text(detectedObject && detectedObject.title) || member.id
    };
  }

  function ensureEnoviaApi() {
    if (!global.EnoviaApi || typeof global.EnoviaApi.getEngItem !== 'function') {
      throw new Error('EnoviaApi indisponível para resolver auto-contexto.');
    }
  }

  function queryString(field, value) {
    return field + ':' + '"' + text(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  }

  function tryDirectHex(detectedObject) {
    var id = text(detectedObject && detectedObject.id);
    if (!isEngItemId(id)) return Promise.resolve(null);
    return global.EnoviaApi.getEngItem(id).then(function (response) {
      return buildResolved(firstMember(response), 'direct-hex-engitem-get', detectedObject, 0);
    });
  }

  function exactByField(query, field, value, detectedObject) {
    return global.EnoviaApi.getEngItemUqlSearch(query, 20).then(function (response) {
      var expected = normalize(value);
      var matches = membersOf(response).filter(function (member) {
        return normalize(objectValue(member, [field, 'name', 'title', 'label'])) === expected;
      });
      if (!matches.length) {
        throw new Error('Nenhum candidato encontrado para ' + field + ': ' + value + '.');
      }
      if (matches.length > 1) {
        var error = new Error('Múltiplos candidatos encontrados para auto-contexto.');
        error.code = 'AMBIGUOUS';
        error.candidates = matches.map(normalizeMember);
        throw error;
      }
      return global.EnoviaApi.getEngItem(normalizeMember(matches[0]).id).then(function (responseById) {
        return buildResolved(firstMember(responseById), field === 'name' ? 'uql-name-prd' : 'uql-title-label', detectedObject, 0);
      });
    });
  }

  function chooseScoredCandidate(response, detectedObject) {
    var candidates = membersOf(response).map(function (member) {
      return {
        member: member,
        normalized: normalizeMember(member),
        score: scoreCandidate(member, detectedObject)
      };
    }).filter(function (entry) {
      return !!entry.normalized.id;
    }).sort(function (left, right) {
      return right.score - left.score;
    });
    if (!candidates.length) return null;
    if (candidates.length > 1 && candidates[0].score === candidates[1].score) {
      return { ambiguous: true, candidates: candidates.slice(0, 5) };
    }
    if (candidates[0].score < 150) {
      return { ambiguous: true, candidates: candidates.slice(0, 5) };
    }
    return { winner: candidates[0], candidates: candidates.slice(0, 5) };
  }

  function tryScoredSearch(detectedObject) {
    var seed = text(detectedObject && (detectedObject.id || detectedObject.name || detectedObject.title));
    if (!seed) return Promise.resolve(null);
    return global.EnoviaApi.getEngItemUqlSearch(seed, 20).then(function (response) {
      var scored = chooseScoredCandidate(response, detectedObject);
      if (!scored || !scored.winner) {
        var error = new Error('Busca pontuada ambígua para auto-contexto.');
        error.code = 'AMBIGUOUS';
        error.candidates = scored && scored.candidates
          ? scored.candidates.map(function (entry) { return entry.normalized; })
          : [];
        throw error;
      }
      return global.EnoviaApi.getEngItem(scored.winner.normalized.id).then(function (responseById) {
        var resolved = buildResolved(responseById && (responseById.member || responseById), 'search-score-best-match', detectedObject, 0);
        resolved.candidates = scored.candidates.map(function (entry) {
          return {
            id: entry.normalized.id,
            name: entry.normalized.name,
            title: entry.normalized.title,
            score: entry.score
          };
        });
        return resolved;
      });
    });
  }

  function resolve(detectedObject) {
    detectedObject = detectedObject || {};
    ensureEnoviaApi();
    var detectedId = text(detectedObject.id);
    var detectedTitle = text(detectedObject.title || detectedObject.name);
    var attempts = [];

    return tryDirectHex(detectedObject).then(function (resolved) {
      if (resolved) return resolved;
      if (isPrdId(detectedId)) {
        attempts.push('uql-name-prd');
        return exactByField(queryString('name', detectedId), 'name', detectedId, detectedObject);
      }
      return null;
    }).then(function (resolved) {
      if (resolved) return resolved;
      if (detectedTitle) {
        attempts.push('uql-title-label');
        return exactByField(queryString('label', detectedTitle), 'title', detectedTitle, detectedObject);
      }
      return null;
    }).then(function (resolved) {
      if (resolved) return resolved;
      attempts.push('search-score-best-match');
      return tryScoredSearch(detectedObject);
    }).catch(function (error) {
      if (error && error.code === 'AMBIGUOUS') {
        return {
          ok: false,
          reason: 'Objeto ambíguo no Explorer; refine a seleção antes de auto-carregar.',
          resolverStrategy: attempts[attempts.length - 1] || 'search-score-best-match',
          candidates: error.candidates || []
        };
      }
      return {
        ok: false,
        reason: text(error && error.message) || 'Não foi possível resolver o objeto detectado.',
        resolverStrategy: attempts[attempts.length - 1] || ''
      };
    });
  }

  global.BomExpandableObjectResolver = {
    resolve: resolve,
    estimateDepth: estimateDepth,
    scoreCandidate: scoreCandidate,
    isEngItemId: isEngItemId,
    isPrdId: isPrdId
  };
})(window);
