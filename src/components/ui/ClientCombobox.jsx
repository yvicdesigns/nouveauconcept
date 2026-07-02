import SearchCombobox from './SearchCombobox';

const ClientCombobox = ({ clients = [], value, onChange, placeholder = 'Rechercher un client…' }) => {
  const items = clients.map(c => ({
    id: c.id,
    label: c.name,
    sublabel: c.company || undefined,
  }));
  return <SearchCombobox items={items} value={value} onChange={onChange} placeholder={placeholder} />;
};

export default ClientCombobox;
