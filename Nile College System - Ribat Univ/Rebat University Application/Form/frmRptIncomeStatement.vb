Imports System.Data.SqlClient

Public Class frmRptIncomeStatement

    Sub FillColleges()
        Try
            Dim CollegeList As New ArrayList
            CollegeList = GetCollegesList()

            For Each CollegeName As String In CollegeList
                Me.CombCollege.Items.Add(CollegeName)
            Next
        Catch ex As Exception
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        Me.Close()
    End Sub

    Private Sub frmRptIncomeStatement_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        FillColleges()
        Me.RCollege.Checked = True
        Me.CombCollege.SelectedIndex = 0
    End Sub

    Private Sub RCollege_CheckedChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles RCollege.CheckedChanged
        If Me.RCollege.Checked = True Then
            Me.CombCollege.Enabled = True
        ElseIf Me.RAll.Checked = True Then
            Me.CombCollege.Enabled = False
        End If
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim StrSel As String

            If Me.RCollege.Checked = True Then
                StrSel = "Select N'" & Me.DateTimePicker1.Value.ToString & "' Descr,N'" & _
                         Me.DateTimePicker2.Value.ToString & "' AcdYear,College,Acc1,Acc2," & _
                         "Sum(TotalValueIn)-Sum(TotalValueOut) TotalValueIn " & _
                         "From Transactions Where College=N'" & Me.CombCollege.SelectedItem & _
                         "' and TransDate>N'" & Me.DateTimePicker1.Value.ToShortDateString & " 00:00:01' " & _
                         "  and TransDate<N'" & Me.DateTimePicker2.Value.ToShortDateString & " 23:59:59' " & _
                         "  and Acc1 In (N'الإيرادات',N'المنصرفات') Group By College,Acc1,Acc2"
            ElseIf Me.RAll.Checked = True Then
                StrSel = "Select N'" & Me.DateTimePicker1.Value.ToString & "' Descr,N'" & _
                         Me.DateTimePicker2.Value.ToString & "' AcdYear,N' ' College,Acc1,Acc2," & _
                         "Sum(TotalValueIn)-Sum(TotalValueOut) TotalValueIn " & _
                         "From Transactions Where " & _
                         " TransDate>N'" & Me.DateTimePicker1.Value.ToShortDateString & " 00:00:01' " & _
                         " and TransDate<N'" & Me.DateTimePicker2.Value.ToShortDateString & " 23:59:59' and " & _
                         " Acc1 In (N'الإيرادات',N'المنصرفات') and College Is Not Null and College<>N'' Group By College,Acc1,Acc2"
            End If

            Dim dap As New SqlDataAdapter(StrSel, cnn)
            Dim das As New DataSet
            das.Clear()

            cnn.Open()
            dap.Fill(das, "Transactions")
            cnn.Close()

            Dim rpt As New IncomeStatementByCollege
            rpt.SetDataSource(das)
            RptViewer.CrystalReportViewer1.ReportSource = rpt
            RptViewer.CrystalReportViewer1.RefreshReport()
            RptViewer.CrystalReportViewer1.Zoom(60)
            RptViewer.ShowDialog()
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub
End Class