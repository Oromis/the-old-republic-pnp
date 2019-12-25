const baseLevel = 5

const categoryList = [
  { name: 'A*',	costs: [20,1,1,1,1,1,1,1,1,2,2,2,3,3,4,4,5,5,5,6,6,7,7,8,8,8,9,9,10,10,11,11,12,12,13,13,14,14,15,15,16,16,17,18,18,19,19,19,20,20,21,21,22,23,23,24,24,24,25,25,26,26,27,28,28,29,30,30,31,31,31,32,32,33,33,34,35,35,36,37,37,38,38,39,39,40,41,41,42,42,43,43,44,44,45,45] },
  { name: 'A',	costs: [20,1,1,2,2,2,3,3,3,4,4,4,5,5,6,6,7,7,7,8,8,9,9,10,10,10,11,11,12,12,13,13,14,14,15,15,16,16,17,17,18,18,19,20,20,21,21,21,22,22,23,23,24,25,25,26,26,26,27,27,28,28,29,30,30,31,32,32,33,33,33,34,34,35,35,36,37,37,38,39,39,40,40,41,41,42,43,43,44,44,45,45,46,46,47,47] },
  { name: 'B',	costs: [40,2,3,3,4,5,5,6,7,7,8,8,9,10,11,12,13,14,15,16,17,18,18,19,19,20,21,22,23,24,25,26,27,28,29,31,32,33,34,35,36,37,38,39,40,40,41,42,44,45,46,47,48,49,50,50,51,52,54,55,56,57,58,59,61,62,63,64,64,65,66,68,69,70,72,73,74,75,76,77,78,79,80,81,83,84,85,86,87,88,90,91,92,93,94,95] },
  { name: 'C',	costs: [60,2,3,5,6,7,8,9,10,11,12,13,14,16,17,18,20,21,22,24,25,26,27,28,29,31,32,34,35,37,38,40,41,43,44,46,47,48,50,51,52,54,55,56,58,59,60,62,63,65,67,68,70,71,73,74,75,77,78,80,82,83,85,88,92,95,96,98,99,100,102,103,105,107,108,110,112,113,115,116,118,119,120,122,123,125,127,128,130,132,133,135,136,138,139,140] },
  { name: 'D',	costs: [80,3,4,6,7,9,10,12,13,15,16,17,19,20,22,24,25,27,29,31,33,35,36,38,39,41,43,45,47,48,50,52,53,55,58,62,65,67,68,70,72,73,75,78,80,83,85,87,88,90,92,93,95,98,100,103,105,107,108,110,112,113,115,118,122,125,126,128,129,130,133,137,140,142,143,145,147,148,150,153,155,158,160,162,163,165,167,168,170,173,177,180,183,185,188,190] },
  { name: 'E',	costs: [100,4,6,7,9,11,13,15,17,18,20,21,23,26,28,30,32,34,36,39,41,43,45,46,48,50,53,55,58,62,65,67,68,70,73,77,80,82,83,85,88,92,95,98,100,103,105,107,108,110,113,117,120,123,125,128,130,132,133,135,138,142,145,148,152,155,158,160,163,165,167,168,170,173,177,180,183,187,190,193,195,198,200,203,207,210,213,217,220,223,227,230,233,235,238,240] },
  { name: 'F',	costs: [160,6,9,11,14,17,19,22,25,27,30,32,35,38,41,44,47,50,53,57,60,64,68,71,75,78,82,85,88,92,95,98,102,105,110,115,120,123,127,130,133,137,140,144,148,151,155,158,162,165,170,175,180,184,188,191,195,200,205,210,213,217,220,223,227,230,235,240,245,250,253,257,260,263,267,270,277,283,290,293,295,298,300,303,307,310,317,323,330,333,337,340,343,345,348,350] },
  { name: 'G',	costs: [200,8,11,15,18,22,26,30,33,36,39,42,46,51,55,60,65,70,75,80,85,88,90,93,95,100,105,110,115,120,125,130,135,140,147,153,160,165,170,175,180,185,190,195,200,205,210,213,217,220,227,233,240,245,250,255,260,263,267,270,277,283,290,297,303,310,315,320,325,330,333,337,340,347,353,360,367,373,380,385,390,395,400,407,413,420,427,433,440,447,453,460,465,470,475,480] },
  { name: 'H',	costs: [400,16,22,29,35,43,52,60,66,73,79,85,93,102,110,120,130,140,148,157,165,173,180,188,195,203,212,220,230,240,250,260,270,280,293,306,320,330,340,350,360,370,380,388,395,403,410,423,436,450,460,470,480,488,495,503,510,523,536,550,560,570,580,593,606,620,628,635,643,650,663,676,690,700,710,720,733,746,760,770,780,790,800,810,820,830,843,856,870,883,896,910,920,930,940,950] },
]

function getCostTable(category) {
  category = category.toUpperCase()
  const entry = categoryList.find(cat => cat.name === category)
  if (entry == null) {
    throw new Error(`Invalid XP category ${category}`)
  }
  return entry.costs
}

export default {
  /**
   * Calculates the XP cost of upgrading a property from one value to another
   * @param category The XP Table category ("A", "B", "C", ...)
   * @param from The starting value of the property
   * @param to The desired value of the property
   * @returns {number} The amount of XP it costs to reach the desired level
   */
  getUpgradeCost({ category, from = 0, to = from + 1 }) {
    const costTable = getCostTable(category)

    if (from >= to)
      return 0

    if (from < baseLevel - 1) {
      from = baseLevel - 1
    }
    if (to < baseLevel) {
      to = baseLevel
    }

    let cost = 0
    for (let index = from + 1 - baseLevel; index <= to - baseLevel; ++index) {
      cost += costTable[index >= costTable.length ? costTable.length - 1 : index]
    }
    return cost
  },

  /**
   * Returns the cost to activate a skill of a certain category
   * @param category The category to look up
   * @return The activation cost in XP
   */
  getActivationCost(category) {
    const costTable = getCostTable(category)
    return costTable[0]
  },

  /**
   * Calculates the number of points gained from investing a specified amount of XP into a property
   * @param category The XP Table category ("A", "B", "C", ...)
   * @param xp The amount of XP to invest
   * @param from The starting value of the property
   * @returns {number} The number of whole points gained. Will not return fractional results.
   */
  getPointsFromXp({ category, xp, from = baseLevel - 1 }) {
    const costTable = getCostTable(category)

    let budget = xp
    if (from < baseLevel - 1) {
      from = baseLevel - 1
    }

    let points = 0
    let index = Math.min(from + 1 - baseLevel, costTable.length - 1)
    while (budget >= costTable[index]) {
      if(index === 0)
        points += baseLevel
      else
        ++points
      budget -= costTable[index]
      index = Math.min(costTable.length - 1, index + 1)
    }
    return points
  },

  /**
   * @deprecated
   */
  getCategories() {
    return categoryList.map(cat => cat.name)
  },

  get categoryNames() {
    return categoryList.map(cat => cat.name)
  }
}
