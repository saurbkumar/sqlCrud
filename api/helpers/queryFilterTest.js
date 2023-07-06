const filter = require('./mongoFilter');

// console.log(filter.parse(`age in ( 'dd')`));
console.log(
  JSON.stringify(filter.parse(`age in ( '23', '45') and address = 'saueabh'`))
);

console.log(JSON.stringify(filter.parse(`address in ( 'dd')`)));
console.log(
  JSON.stringify(filter.parse(`(country in ( 'dd') and address = 'saueabh')`))
);
console.log(
  JSON.stringify(
    filter.parse(
      `(country in ( 'dd') and (address = 'saueabh' or address in ('s','dds') and (  age in ( '23', '45'))))`
    )
  )
);

console.log(
  JSON.stringify(
    filter.parse(
      `name = 'dd' and   age = '10' and  (address not in  ('add1',      'add2' ) or country =  'cty')`
    )
  )
);
