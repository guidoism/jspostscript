DOC= README introduction
PS= piemenu.ps pullout.ps quickwin.ps textcan.ps \
	overlay.ps pointer.ps mics.ps litecyber.ps \
	distill.ps ps.ps scrap.ps cond.ps trace.ps \
        doc.ps
SCRIPT= litecyber
DEMOS= arpa.map advent.map

STUFF= ${DOC} ${PS} ${SCRIPT} ${DEMOS}

all:	${STUFF}
	-rm -f cyber.shar*
	tar cf cyber.tar ${STUFF}
	compress cyber.tar
	uuencode cyber.tar.Z < cyber.tar.Z > cyber.tar.Z.uu
#	split cyber.shar.Z.uu cyber.shar.Z.uu.
#	rm cyber.shar.Z cyber.shar.Z.uu
