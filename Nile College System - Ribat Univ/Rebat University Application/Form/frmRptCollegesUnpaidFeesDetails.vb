Imports System.Data.SqlClient

Public Class frmRptCollegesUnpaidFeesDetails

    Sub FillColleges()
        Try
            Dim CollegeList As New ArrayList
            CollegeList = GetCollegesList()
            Me.CombCollege.Items.Clear()

            For Each CollegeName As String In CollegeList
                Me.CombCollege.Items.Add(CollegeName)
            Next
        Catch ex As Exception
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub frmRptCollegesUnpaidFeesDetails_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        FillColleges()
        Me.RAll.Checked = True
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        Me.Close()
    End Sub

    Private Sub RAll_CheckedChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles RAll.CheckedChanged
        If Me.RAll.Checked = True Then
            Me.CombCollege.Enabled = False
        ElseIf Me.RCollege.Checked = True Then
            Me.CombCollege.Enabled = True
        End If
    End Sub

    Private Sub Button2_Click_1(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim StrSel As String

            If Me.RAll.Checked = True Then
                StrSel = "Select Distinct N'" & Me.DateTimePicker1.Value.ToString & _
                         "' Descr,College Acc1,Batch Acc2,dbo.GetCollegeStudFeesBatch(College,Batch,N'" & _
                         Me.DateTimePicker1.Value.ToShortDateString & " 23:59:59')-dbo.GetCollegePaidFeesBatch(College,Batch,N'" & _
                         Me.DateTimePicker1.Value.ToShortDateString & " 23:59:59') TotalValueIn From Transactions Where Batch Is Not Null  and (Acc2<>N'رسوم الدمغة' or  Acc2 is Null)"
            ElseIf Me.RCollege.Checked = True Then
                StrSel = "Select Distinct N'" & Me.DateTimePicker1.Value.ToString & _
                         "' Descr,College Acc1,Batch Acc2,dbo.GetCollegeStudFeesBatch(College,Batch,N'" & _
                         Me.DateTimePicker1.Value.ToShortDateString & " 23:59:59')-dbo.GetCollegePaidFeesBatch(College,Batch,N'" & _
                         Me.DateTimePicker1.Value.ToShortDateString & " 23:59:59') TotalValueIn From Transactions Where Batch Is Not Null   and (Acc2<>N'رسوم الدمغة' or  Acc2 is Null)" & _
                         " and College=N'" & Me.CombCollege.SelectedItem & "'"
            End If
            Dim dap As New SqlDataAdapter(StrSel, cnn)
            Dim das As New DataSet
            das.Clear()
            ' dap.SelectCommand.CommandTimeout = 300
            cnn.Open()
            dap.Fill(das, "Transactions")
            cnn.Close()

            Dim rpt As New CollegesUnpaidFeesDetails
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

    Private Sub RCollege_CheckedChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles RCollege.CheckedChanged

    End Sub
End Class