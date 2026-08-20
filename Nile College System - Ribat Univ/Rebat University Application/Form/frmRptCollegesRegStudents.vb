Imports System.Data.SqlClient

Public Class frmRptCollegesRegStudents

    Private Sub frmRptCollegesRegStudents_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        Try
            Dim CollegeList As New ArrayList
            CollegeList = GetCollegesList()

            For Each CollegeName As String In CollegeList
                Me.CombColleges.Items.Add(CollegeName)
            Next
        Catch ex As Exception
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        Me.Close()
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim dap As New SqlDataAdapter("Select * From Transactions Where Transtype = N'سند قبض' and " & _
                                          "TransDate>N'" & Me.DateTimePicker1.Value.ToShortDateString & " 00:00:01' and " & _
                                          "TransDate<N'" & Me.DateTimePicker2.Value.ToShortDateString & " 23:59:59' " & _
                                          "and College=N'" & Me.CombColleges.SelectedItem & "'", cnn1)
            Dim das As New DataSet
            das.Clear()

            cnn1.Open()
            dap.Fill(das, "Transactions")
            cnn1.Close()

            Dim rpt As New CollegesStudReg
            rpt.SetDataSource(das)
            RptViewer.CrystalReportViewer1.ReportSource = rpt
            RptViewer.CrystalReportViewer1.RefreshReport()
            RptViewer.CrystalReportViewer1.Zoom(60)
            RptViewer.ShowDialog()
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub
End Class